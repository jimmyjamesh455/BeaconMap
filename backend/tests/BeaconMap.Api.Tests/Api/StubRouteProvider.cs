using BeaconMap.Api.Routing;

namespace BeaconMap.Api.Tests.Api;

/// <summary>Records what the route endpoint passes it and returns a canned result (or throws).</summary>
public sealed class StubRouteProvider : IRouteProvider
{
    private readonly RouteResult _result;
    private readonly Exception? _throw;

    public IReadOnlyList<HazardZone>? LastAvoidZones { get; private set; }
    public string? LastProfile { get; private set; }

    public StubRouteProvider(RouteResult? result = null, Exception? toThrow = null)
    {
        _result = result ?? new RouteResult([new RoutePoint(51.5, -0.1)], 100, 60);
        _throw = toThrow;
    }

    public Task<RouteResult> GetRouteAsync(
        RoutePoint start,
        RoutePoint end,
        string profile,
        IReadOnlyList<HazardZone> avoidZones,
        CancellationToken cancellationToken = default)
    {
        LastAvoidZones = avoidZones;
        LastProfile = profile;

        if (_throw is not null)
        {
            throw _throw;
        }

        return Task.FromResult(_result);
    }
}
