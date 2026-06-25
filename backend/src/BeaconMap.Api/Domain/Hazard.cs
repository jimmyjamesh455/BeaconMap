using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Domain;

/// <summary>
/// A point hazard with a danger radius. Every hazard blocks routing (becomes an avoid-zone).
/// </summary>
public class Hazard
{
    public const double DefaultRadiusMeters = 100;
    public const double MaxRadiusMeters = 5000;

    public Guid Id { get; set; }
    public Guid DisasterId { get; set; }
    public HazardType Type { get; set; }

    /// <summary>The hazard location (WGS84 point).</summary>
    public Point Location { get; set; } = default!;

    public double RadiusMeters { get; set; } = DefaultRadiusMeters;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
