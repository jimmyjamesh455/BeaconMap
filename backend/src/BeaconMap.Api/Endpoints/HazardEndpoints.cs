using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;
using BeaconMap.Api.Geometry;
using BeaconMap.Api.Persistence;
using BeaconMap.Api.RealTime;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Endpoints;

public static class HazardEndpoints
{
    public static IEndpointRouteBuilder MapHazardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/disasters/{disasterId:guid}/hazards");

        group.MapGet("", async (Guid disasterId, AppDbContext db) =>
        {
            if (!await DisasterExists(db, disasterId))
            {
                return Results.NotFound();
            }

            var hazards = await db.Hazards
                .Where(h => h.DisasterId == disasterId)
                .OrderBy(h => h.CreatedAtUtc)
                .ToListAsync();
            return Results.Ok(hazards.Select(ToResponse));
        });

        group.MapPost("", async (Guid disasterId, CreateHazardRequest request, AppDbContext db, IMapNotifier notifier) =>
        {
            if (!await DisasterExists(db, disasterId))
            {
                return Results.NotFound();
            }

            if (request.RadiusMeters is <= 0 or > Hazard.MaxRadiusMeters)
            {
                return Results.BadRequest(new { error = "RadiusMeters must be between 1 and 5000." });
            }

            var hazard = new Hazard
            {
                Id = Guid.NewGuid(),
                DisasterId = disasterId,
                Type = request.Type,
                Location = Spatial.Point(request.Lat, request.Lng),
                RadiusMeters = request.RadiusMeters ?? Hazard.DefaultRadiusMeters,
                Description = request.Description,
                CreatedAtUtc = DateTime.UtcNow,
            };

            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var dto = ToResponse(hazard);
            await notifier.HazardCreated(disasterId, dto);

            return Results.Created($"/api/disasters/{disasterId}/hazards/{hazard.Id}", dto);
        });

        group.MapPut("/{id:guid}", async (Guid disasterId, Guid id, UpdateHazardRequest request, AppDbContext db, IMapNotifier notifier) =>
        {
            if (request.RadiusMeters is <= 0 or > Hazard.MaxRadiusMeters)
            {
                return Results.BadRequest(new { error = "RadiusMeters must be between 1 and 5000." });
            }

            var hazard = await db.Hazards
                .FirstOrDefaultAsync(h => h.Id == id && h.DisasterId == disasterId);
            if (hazard is null)
            {
                return Results.NotFound();
            }

            hazard.Type = request.Type;
            hazard.Location = Spatial.Point(request.Lat, request.Lng);
            hazard.RadiusMeters = request.RadiusMeters ?? Hazard.DefaultRadiusMeters;
            hazard.Description = request.Description;
            await db.SaveChangesAsync();

            var dto = ToResponse(hazard);
            await notifier.HazardUpdated(disasterId, dto);

            return Results.Ok(dto);
        });

        group.MapDelete("/{id:guid}", async (Guid disasterId, Guid id, AppDbContext db, IMapNotifier notifier) =>
        {
            var hazard = await db.Hazards
                .FirstOrDefaultAsync(h => h.Id == id && h.DisasterId == disasterId);
            if (hazard is null)
            {
                return Results.NotFound();
            }

            db.Hazards.Remove(hazard);
            await db.SaveChangesAsync();
            await notifier.HazardDeleted(disasterId, id);

            return Results.NoContent();
        });

        return app;
    }

    private static Task<bool> DisasterExists(AppDbContext db, Guid disasterId) =>
        db.Disasters.AnyAsync(d => d.Id == disasterId);

    private static HazardDto ToResponse(Hazard h) => new(
        h.Id,
        h.DisasterId,
        h.Type,
        h.Location.Y,
        h.Location.X,
        h.RadiusMeters,
        h.Description,
        h.CreatedAtUtc);
}
