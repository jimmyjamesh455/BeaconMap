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
}

/// <summary>Thrown when the routing provider cannot return a route.</summary>
public class RouteProviderException : Exception
{
    public RouteProviderException(string message) : base(message) { }
    public RouteProviderException(string message, Exception inner) : base(message, inner) { }
}
