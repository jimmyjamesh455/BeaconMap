using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;
using BeaconMap.Api.Geometry;
using BeaconMap.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Endpoints;

public static class DisasterEndpoints
{
    public static IEndpointRouteBuilder MapDisasterEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/disasters");

        group.MapGet("", async (AppDbContext db) =>
        {
            var disasters = await db.Disasters
                .OrderBy(d => d.CreatedAtUtc)
                .ToListAsync();
            return Results.Ok(disasters.Select(ToResponse));
        });

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var disaster = await db.Disasters.FindAsync(id);
            return disaster is null ? Results.NotFound() : Results.Ok(ToResponse(disaster));
        });

        group.MapPost("", async (CreateDisasterRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name, request.Area) is { } error)
            {
                return error;
            }

            var disaster = new Disaster
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Type = request.Type,
                Area = Spatial.Polygon(request.Area),
                Description = request.Description,
                CreatedAtUtc = DateTime.UtcNow,
            };

            db.Disasters.Add(disaster);
            await db.SaveChangesAsync();

            return Results.Created($"/api/disasters/{disaster.Id}", ToResponse(disaster));
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateDisasterRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name, request.Area) is { } error)
            {
                return error;
            }

            var disaster = await db.Disasters.FindAsync(id);
            if (disaster is null)
            {
                return Results.NotFound();
            }

            disaster.Name = request.Name;
            disaster.Type = request.Type;
            disaster.Area = Spatial.Polygon(request.Area);
            disaster.Description = request.Description;
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(disaster));
        });

        group.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var disaster = await db.Disasters.FindAsync(id);
            if (disaster is null)
            {
                return Results.NotFound();
            }

            db.Disasters.Remove(disaster);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        return app;
    }

    private static IResult? Validate(string? name, LatLng[]? area)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Results.BadRequest(new { error = "Name is required." });
        }

        if (area is null || area.Length < 3)
        {
            return Results.BadRequest(new { error = "Area must have at least 3 points." });
        }

        return null;
    }

    private static DisasterDto ToResponse(Disaster d) => new(
        d.Id,
        d.Name,
        d.Type,
        Spatial.ToLatLngRing(d.Area),
        d.Description,
        d.CreatedAtUtc);
}
