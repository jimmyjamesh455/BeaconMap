using System.Net;
using System.Text.Json;
using BeaconMap.Api.Routing;

namespace BeaconMap.Api.Tests.Routing;

public class OpenRouteServiceProviderTests
{
    private const string SuccessJson = """
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": { "summary": { "distance": 1234.5, "duration": 678.9 } },
          "geometry": {
            "type": "LineString",
            "coordinates": [ [-0.13, 51.50], [-0.12, 51.51], [-0.11, 51.52] ]
          }
        }
      ]
    }
    """;

    private static readonly RoutePoint Start = new(51.50, -0.13);
    private static readonly RoutePoint End = new(51.52, -0.11);

    private static OpenRouteServiceProvider CreateProvider(FakeHttpMessageHandler handler, string apiKey = "test-key")
    {
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.openrouteservice.org/") };
        return new OpenRouteServiceProvider(http, new OpenRouteServiceOptions { ApiKey = apiKey });
    }

    [Fact]
    public async Task OrsProvider_sends_avoid_polygons_for_each_hazard()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler);
        var hazards = new[]
        {
            new HazardZone(51.50, -0.12, 100),
            new HazardZone(51.51, -0.11, 200),
        };

        await provider.GetRouteAsync(Start, End, "driving-car", hazards);

        using var body = JsonDocument.Parse(handler.LastRequestBody!);
        var avoid = body.RootElement.GetProperty("options").GetProperty("avoid_polygons");
        Assert.Equal("MultiPolygon", avoid.GetProperty("type").GetString());
        Assert.Equal(2, avoid.GetProperty("coordinates").GetArrayLength());
    }

    [Fact]
    public async Task OrsProvider_sends_coordinates_in_lng_lat_order()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler);

        await provider.GetRouteAsync(Start, End, "driving-car", []);

        using var body = JsonDocument.Parse(handler.LastRequestBody!);
        var coords = body.RootElement.GetProperty("coordinates");
        Assert.Equal(-0.13, coords[0][0].GetDouble(), precision: 6); // lng first
        Assert.Equal(51.50, coords[0][1].GetDouble(), precision: 6); // lat second
    }

    [Fact]
    public async Task OrsProvider_sends_api_key_header()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler, apiKey: "secret-123");

        await provider.GetRouteAsync(Start, End, "driving-car", []);

        Assert.True(handler.LastRequest!.Headers.TryGetValues("Authorization", out var values));
        Assert.Equal("secret-123", values!.Single());
    }

    [Fact]
    public async Task OrsProvider_targets_requested_profile()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler);

        await provider.GetRouteAsync(Start, End, "foot-walking", []);

        Assert.Contains("v2/directions/foot-walking", handler.LastRequest!.RequestUri!.ToString());
    }

    [Fact]
    public async Task OrsProvider_maps_geojson_line_to_route_coordinates()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler);

        var result = await provider.GetRouteAsync(Start, End, "driving-car", []);

        Assert.Equal(3, result.Coordinates.Count);
        Assert.Equal(51.50, result.Coordinates[0].Lat, precision: 6);
        Assert.Equal(-0.13, result.Coordinates[0].Lng, precision: 6);
        Assert.Equal(1234.5, result.DistanceMeters);
        Assert.Equal(678.9, result.DurationSeconds);
    }

    [Fact]
    public async Task OrsProvider_omits_avoid_polygons_when_no_hazards()
    {
        var handler = FakeHttpMessageHandler.WithJson(SuccessJson);
        var provider = CreateProvider(handler);

        await provider.GetRouteAsync(Start, End, "driving-car", []);

        using var body = JsonDocument.Parse(handler.LastRequestBody!);
        Assert.False(body.RootElement.TryGetProperty("options", out _));
    }

    [Fact]
    public async Task OrsProvider_throws_typed_error_on_ors_failure()
    {
        var handler = FakeHttpMessageHandler.WithJson("""{ "error": "boom" }""", HttpStatusCode.InternalServerError);
        var provider = CreateProvider(handler);

        await Assert.ThrowsAsync<RouteProviderException>(
            () => provider.GetRouteAsync(Start, End, "driving-car", []));
    }
}
