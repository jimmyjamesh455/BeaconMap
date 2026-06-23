using BeaconMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace BeaconMap.Api.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Disaster> Disasters => Set<Disaster>();
    public DbSet<Hazard> Hazards => Set<Hazard>();
    public DbSet<CoordinationPoint> CoordinationPoints => Set<CoordinationPoint>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Disaster>(e =>
        {
            e.Property(d => d.Name).IsRequired();
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
            e.HasIndex(h => h.DisasterId);
        });

        modelBuilder.Entity<CoordinationPoint>(e =>
        {
            e.Property(c => c.Name).IsRequired();
            e.HasIndex(c => c.DisasterId);
        });
    }
}
