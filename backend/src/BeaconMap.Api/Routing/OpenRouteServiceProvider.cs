using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BeaconMap.Api.Geometry;

namespace BeaconMap.Api.Routing;

/// <summary>
/// Routes via the OpenRouteService Directions API, passing each hazard circle as an
/// <c>avoid_polygons</c> zone so the returned route avoids all recorded hazards.
/// </summary>
public class OpenRouteServiceProvider(HttpClient httpClient, OpenRouteServiceOptions options) : IRouteProvider
{
    public async Task<RouteResult> GetRouteAsync(
        RoutePoint start,
        RoutePoint end,
        string profile,
        IReadOnlyList<HazardZone> avoidZones,
        CancellationToken cancellationToken = default)
    {
        var body = BuildRequestBody(start, end, avoidZones);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"v2/directions/{profile}/geojson")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.TryAddWithoutValidation("Authorization", options.ApiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/geo+json"));

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new RouteProviderException("Failed to reach the routing service.", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new RouteProviderException(DescribeError(detail, (int)response.StatusCode));
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseRoute(json);
    }

    private Dictionary<string, object> BuildRequestBody(
        RoutePoint start, RoutePoint end, IReadOnlyList<HazardZone> avoidZones)
    {
        var body = new Dictionary<string, object>
        {
            ["coordinates"] = new[]
            {
                new[] { start.Lng, start.Lat },
                new[] { end.Lng, end.Lat },
            },
            // Snap each point to the nearest road (so off-road points / coordination points route).
            ["radiuses"] = new[] { options.SnapRadiusMeters, options.SnapRadiusMeters },
        };

        if (avoidZones.Count > 0)
        {
            body["options"] = new Dictionary<string, object>
            {
                ["avoid_polygons"] = new Dictionary<string, object>
                {
                    ["type"] = "MultiPolygon",
                    ["coordinates"] = avoidZones.Select(ToPolygonRings).ToArray(),
                },
            };
        }

        return body;
    }

    /// <summary>Converts a hazard circle to GeoJSON polygon rings ([[ [lng,lat], ... ]]).</summary>
    private static double[][][] ToPolygonRings(HazardZone zone)
    {
        var polygon = CircleToPolygon.Create(zone.Lat, zone.Lng, zone.RadiusMeters);
        var ring = polygon.ExteriorRing.Coordinates
            .Select(c => new[] { c.X, c.Y })
            .ToArray();
        return [ring];
    }

    /// <summary>Pulls a human-readable message out of an ORS error body when possible.</summary>
    private static string DescribeError(string body, int statusCode)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var message))
                {
                    return message.GetString() ?? body;
                }
                if (error.ValueKind == JsonValueKind.String)
                {
                    return error.GetString() ?? body;
                }
            }
        }
        catch (JsonException)
        {
            // Not JSON — fall through to a generic message.
        }

        return statusCode switch
        {
            401 or 403 => "Routing service rejected the request — check the OpenRouteService API key.",
            429 => "Routing service rate limit reached — please try again shortly.",
            _ => $"Routing service returned HTTP {statusCode}.",
        };
    }

    private static RouteResult ParseRoute(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var features = doc.RootElement.GetProperty("features");
            if (features.GetArrayLength() == 0)
            {
                throw new RouteProviderException("No route could be found between the selected points.");
            }

            var feature = features[0];

            var coordinates = feature
                .GetProperty("geometry")
                .GetProperty("coordinates")
                .EnumerateArray()
                .Select(c => new RoutePoint(c[1].GetDouble(), c[0].GetDouble()))
                .ToList();

            var summary = feature.GetProperty("properties").GetProperty("summary");
            var distance = summary.GetProperty("distance").GetDouble();
            var duration = summary.GetProperty("duration").GetDouble();

            return new RouteResult(coordinates, distance, duration);
        }
        catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException or JsonException)
        {
            throw new RouteProviderException("Could not parse the routing service response.", ex);
        }
    }
}
