namespace BeaconMap.Api.Routing;

public interface IRouteProvider
{
    /// <summary>
    /// Computes a route from <paramref name="start"/> to <paramref name="end"/> that avoids
    /// every supplied hazard zone.
    /// </summary>
    Task<RouteResult> GetRouteAsync(
        RoutePoint start,
        RoutePoint end,
        string profile,
        IReadOnlyList<HazardZone> avoidZones,
        CancellationToken cancellationToken = default);
}
