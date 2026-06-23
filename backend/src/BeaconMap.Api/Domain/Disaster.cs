using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Domain;

/// <summary>
/// Top-level event that scopes all hazards, coordination points and routes.
/// </summary>
public class Disaster
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DisasterType Type { get; set; }

    /// <summary>The drawn affected region (WGS84 polygon).</summary>
    public Polygon Area { get; set; } = default!;

    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public List<Hazard> Hazards { get; set; } = [];
    public List<CoordinationPoint> CoordinationPoints { get; set; } = [];
}
