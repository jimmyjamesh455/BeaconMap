namespace BeaconMap.Api.Routing;

public record RoutePoint(double Lat, double Lng);

/// <summary>A hazard expressed as a circular avoid-zone for routing.</summary>
public record HazardZone(double Lat, double Lng, double RadiusMeters);

public record RouteResult(
    IReadOnlyList<RoutePoint> Coordinates,
    double DistanceMeters,
    double DurationSeconds);

public class OpenRouteServiceOptions
{
    public const string DefaultProfile = "driving-car";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openrouteservice.org/";

    /// <summary>
    /// How far (metres) ORS may search for the nearest road when a start/end point is not on
    /// one. -1 means unlimited, so points off the road network (e.g. coordination points) still
    /// route by snapping to the nearest road.
    /// </summary>
    public double SnapRadiusMeters { get; set; } = -1;
}

/// <summary>Thrown when the routing provider cannot return a route.</summary>
public class RouteProviderException : Exception
{
    public RouteProviderException(string message) : base(message) { }
    public RouteProviderException(string message, Exception inner) : base(message, inner) { }
}
