using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;
using BeaconMap.Api.Geometry;
using BeaconMap.Api.Persistence;
using BeaconMap.Api.RealTime;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Endpoints;

public static class CoordinationPointEndpoints
{
    public static IEndpointRouteBuilder MapCoordinationPointEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/disasters/{disasterId:guid}/coordination-points");

        group.MapGet("", async (Guid disasterId, AppDbContext db) =>
        {
            if (!await DisasterExists(db, disasterId))
            {
                return Results.NotFound();
            }

            var points = await db.CoordinationPoints
                .Where(c => c.DisasterId == disasterId)
                .OrderBy(c => c.CreatedAtUtc)
                .ToListAsync();
            return Results.Ok(points.Select(ToResponse));
        });

        group.MapPost("", async (Guid disasterId, CreateCoordinationPointRequest request, AppDbContext db, IMapNotifier notifier) =>
        {
            if (!await DisasterExists(db, disasterId))
            {
                return Results.NotFound();
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { error = "Name is required." });
            }

            var point = new CoordinationPoint
            {
                Id = Guid.NewGuid(),
                DisasterId = disasterId,
                Name = request.Name,
                Type = request.Type,
                Location = Spatial.Point(request.Lat, request.Lng),
                Description = request.Description,
                CreatedAtUtc = DateTime.UtcNow,
            };

            db.CoordinationPoints.Add(point);
            await db.SaveChangesAsync();

            var dto = ToResponse(point);
            await notifier.CoordinationPointCreated(disasterId, dto);

            return Results.Created($"/api/disasters/{disasterId}/coordination-points/{point.Id}", dto);
        });

        group.MapPut("/{id:guid}", async (Guid disasterId, Guid id, UpdateCoordinationPointRequest request, AppDbContext db, IMapNotifier notifier) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { error = "Name is required." });
            }

            var point = await db.CoordinationPoints
                .FirstOrDefaultAsync(c => c.Id == id && c.DisasterId == disasterId);
            if (point is null)
            {
                return Results.NotFound();
            }

            point.Name = request.Name;
            point.Type = request.Type;
            point.Location = Spatial.Point(request.Lat, request.Lng);
            point.Description = request.Description;
            await db.SaveChangesAsync();

            var dto = ToResponse(point);
            await notifier.CoordinationPointUpdated(disasterId, dto);

            return Results.Ok(dto);
        });

        group.MapDelete("/{id:guid}", async (Guid disasterId, Guid id, AppDbContext db, IMapNotifier notifier) =>
        {
            var point = await db.CoordinationPoints
                .FirstOrDefaultAsync(c => c.Id == id && c.DisasterId == disasterId);
            if (point is null)
            {
                return Results.NotFound();
            }

            db.CoordinationPoints.Remove(point);
            await db.SaveChangesAsync();
            await notifier.CoordinationPointDeleted(disasterId, id);

            return Results.NoContent();
        });

        return app;
    }

    private static Task<bool> DisasterExists(AppDbContext db, Guid disasterId) =>
        db.Disasters.AnyAsync(d => d.Id == disasterId);

    private static CoordinationPointDto ToResponse(CoordinationPoint c) => new(
        c.Id,
        c.DisasterId,
        c.Name,
        c.Type,
        c.Location.Y,
        c.Location.X,
        c.Description,
        c.CreatedAtUtc);
}
