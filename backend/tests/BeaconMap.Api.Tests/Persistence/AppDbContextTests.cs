using BeaconMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Tests.Persistence;

public class AppDbContextTests
{
    [Fact]
    public void Disaster_round_trips_area_polygon()
    {
        using var fx = new SqliteSpatialFixture();
        var id = Guid.NewGuid();

        using (var ctx = fx.CreateContext())
        {
            ctx.Disasters.Add(new Disaster
            {
                Id = id,
                Name = "Test Quake",
                Type = DisasterType.Earthquake,
                Area = SqliteSpatialFixture.Square(51.5, -0.12),
                CreatedAtUtc = DateTime.UtcNow,
            });
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            var loaded = ctx.Disasters.Single(d => d.Id == id);
            Assert.NotNull(loaded.Area);
            Assert.Equal(5, loaded.Area.ExteriorRing.Coordinates.Length);
            Assert.Equal(DisasterType.Earthquake, loaded.Type);
        }
    }

    [Fact]
    public void Hazard_round_trips_location_and_radius()
    {
        using var fx = new SqliteSpatialFixture();
        var disasterId = SeedDisaster(fx);
        var hazardId = Guid.NewGuid();

        using (var ctx = fx.CreateContext())
        {
            ctx.Hazards.Add(new Hazard
            {
                Id = hazardId,
                DisasterId = disasterId,
                Type = HazardType.Fire,
                Location = SqliteSpatialFixture.Point(51.51, -0.13),
                RadiusMeters = 250,
                CreatedAtUtc = DateTime.UtcNow,
            });
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            var loaded = ctx.Hazards.Single(h => h.Id == hazardId);
            Assert.Equal(51.51, loaded.Location.Y, precision: 6);
            Assert.Equal(-0.13, loaded.Location.X, precision: 6);
            Assert.Equal(250, loaded.RadiusMeters);
            Assert.Equal(HazardType.Fire, loaded.Type);
        }
    }

    [Fact]
    public void Hazard_belongs_to_disaster()
    {
        using var fx = new SqliteSpatialFixture();
        var disasterId = SeedDisaster(fx);

        using (var ctx = fx.CreateContext())
        {
            ctx.Hazards.Add(new Hazard
            {
                Id = Guid.NewGuid(),
                DisasterId = disasterId,
                Type = HazardType.BlockedRoad,
                Location = SqliteSpatialFixture.Point(51.5, -0.12),
                RadiusMeters = 100,
                CreatedAtUtc = DateTime.UtcNow,
            });
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            var disaster = ctx.Disasters.Include(d => d.Hazards).Single(d => d.Id == disasterId);
            var hazard = Assert.Single(disaster.Hazards);
            Assert.Equal(disasterId, hazard.DisasterId);
        }
    }

    [Fact]
    public void CoordinationPoint_round_trips()
    {
        using var fx = new SqliteSpatialFixture();
        var disasterId = SeedDisaster(fx);
        var pointId = Guid.NewGuid();

        using (var ctx = fx.CreateContext())
        {
            ctx.CoordinationPoints.Add(new CoordinationPoint
            {
                Id = pointId,
                DisasterId = disasterId,
                Name = "Forward Command",
                Type = CoordinationPointType.CommandPost,
                Location = SqliteSpatialFixture.Point(51.52, -0.10),
                CreatedAtUtc = DateTime.UtcNow,
            });
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            var loaded = ctx.CoordinationPoints.Single(c => c.Id == pointId);
            Assert.Equal("Forward Command", loaded.Name);
            Assert.Equal(CoordinationPointType.CommandPost, loaded.Type);
            Assert.Equal(51.52, loaded.Location.Y, precision: 6);
        }
    }

    [Fact]
    public void Deleting_disaster_cascades_to_hazards()
    {
        using var fx = new SqliteSpatialFixture();
        var disasterId = SeedDisaster(fx);

        using (var ctx = fx.CreateContext())
        {
            ctx.Hazards.Add(new Hazard
            {
                Id = Guid.NewGuid(),
                DisasterId = disasterId,
                Type = HazardType.Fire,
                Location = SqliteSpatialFixture.Point(51.5, -0.12),
                RadiusMeters = 100,
                CreatedAtUtc = DateTime.UtcNow,
            });
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            var disaster = ctx.Disasters.Single(d => d.Id == disasterId);
            ctx.Disasters.Remove(disaster);
            ctx.SaveChanges();
        }

        using (var ctx = fx.CreateContext())
        {
            Assert.Empty(ctx.Hazards.Where(h => h.DisasterId == disasterId));
        }
    }

    private static Guid SeedDisaster(SqliteSpatialFixture fx)
    {
        var id = Guid.NewGuid();
        using var ctx = fx.CreateContext();
        ctx.Disasters.Add(new Disaster
        {
            Id = id,
            Name = "Seed",
            Type = DisasterType.Flood,
            Area = SqliteSpatialFixture.Square(51.5, -0.12),
            CreatedAtUtc = DateTime.UtcNow,
        });
        ctx.SaveChanges();
        return id;
    }
}
