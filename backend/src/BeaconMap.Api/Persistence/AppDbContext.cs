using BeaconMap.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;

namespace BeaconMap.Api.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Disaster> Disasters => Set<Disaster>();
    public DbSet<Hazard> Hazards => Set<Hazard>();
    public DbSet<CoordinationPoint> CoordinationPoints => Set<CoordinationPoint>();

    // Geometries are persisted as WKB blobs and never queried spatially in the database, so the
    // app does not depend on SpatiaLite/mod_spatialite (which is fragile on Linux). All spatial
    // logic runs in C# against NetTopologySuite geometries after they are read back.
    private static ValueConverter<T, byte[]> WkbConverter<T>() where T : NetTopologySuite.Geometries.Geometry =>
        new(g => new WKBWriter().Write(g), b => (T)new WKBReader().Read(b));

    private static ValueComparer<T> WkbComparer<T>() where T : NetTopologySuite.Geometries.Geometry =>
        new(
            (a, b) => (a == null && b == null) || (a != null && b != null && a.EqualsExact(b)),
            g => g == null ? 0 : new WKTWriter().Write(g).GetHashCode(),
            g => (T)g.Copy());

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Disaster>(e =>
        {
            e.Property(d => d.Name).IsRequired();
            e.Property(d => d.Area).HasConversion(WkbConverter<Polygon>(), WkbComparer<Polygon>());
            e.HasMany(d => d.Hazards)
                .WithOne()
                .HasForeignKey(h => h.DisasterId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(d => d.CoordinationPoints)
                .WithOne()
                .HasForeignKey(c => c.DisasterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Hazard>(e =>
        {
            e.Property(h => h.Location).HasConversion(WkbConverter<Point>(), WkbComparer<Point>());
            e.HasIndex(h => h.DisasterId);
        });

        modelBuilder.Entity<CoordinationPoint>(e =>
        {
            e.Property(c => c.Name).IsRequired();
            e.Property(c => c.Location).HasConversion(WkbConverter<Point>(), WkbComparer<Point>());
            e.HasIndex(c => c.DisasterId);
        });
    }
}
