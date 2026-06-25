using BeaconMap.Api.Contracts;
using BeaconMap.Api.Persistence;
using BeaconMap.Api.Routing;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Endpoints;

public static class RouteEndpoints
{
    public static IEndpointRouteBuilder MapRouteEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/disasters/{disasterId:guid}/routes",
            async (Guid disasterId, RouteRequestDto request, AppDbContext db, IRouteProvider provider, CancellationToken ct) =>
            {
                if (!await db.Disasters.AnyAsync(d => d.Id == disasterId, ct))
                {
                    return Results.NotFound();
                }

                if (request.Start is null || request.End is null)
                {
                    return Results.BadRequest(new { error = "Start and End coordinates are required." });
                }

                var avoidZones = await db.Hazards
                    .Where(h => h.DisasterId == disasterId)
                    .Select(h => new HazardZone(h.Location.Y, h.Location.X, h.RadiusMeters))
                    .ToListAsync(ct);

                var profile = string.IsNullOrWhiteSpace(request.Profile)
                    ? OpenRouteServiceOptions.DefaultProfile
                    : request.Profile;

                try
                {
                    var result = await provider.GetRouteAsync(
                        new RoutePoint(request.Start.Lat, request.Start.Lng),
                        new RoutePoint(request.End.Lat, request.End.Lng),
                        profile,
                        avoidZones,
                        ct);

                    var dto = new RouteDto(
                        result.Coordinates.Select(c => new LatLng(c.Lat, c.Lng)).ToArray(),
                        result.DistanceMeters,
                        result.DurationSeconds);
                    return Results.Ok(dto);
                }
                catch (RouteProviderException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status502BadGateway);
                }
            });

        return app;
    }
}
