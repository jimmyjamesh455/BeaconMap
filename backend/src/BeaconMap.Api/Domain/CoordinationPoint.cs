using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Domain;

/// <summary>
/// A named point where responders coordinate (command post, medical station, etc.).
/// </summary>
public class CoordinationPoint
{
    public Guid Id { get; set; }
    public Guid DisasterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public CoordinationPointType Type { get; set; }

    /// <summary>The location (WGS84 point).</summary>
    public Point Location { get; set; } = default!;

    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
