using BeaconMap.Api.Contracts;
using BeaconMap.Api.RealTime;

namespace BeaconMap.Api.Tests.Api;

/// <summary>Records the notifications raised by write endpoints.</summary>
public sealed class SpyMapNotifier : IMapNotifier
{
    public readonly record struct Notification(string Method, Guid DisasterId, object Payload);

    public List<Notification> Notifications { get; } = [];

    public Task HazardCreated(Guid disasterId, HazardDto hazard) => Record("HazardCreated", disasterId, hazard);
    public Task HazardUpdated(Guid disasterId, HazardDto hazard) => Record("HazardUpdated", disasterId, hazard);
    public Task HazardDeleted(Guid disasterId, Guid hazardId) => Record("HazardDeleted", disasterId, hazardId);

    public Task CoordinationPointCreated(Guid disasterId, CoordinationPointDto point) => Record("CoordinationPointCreated", disasterId, point);
    public Task CoordinationPointUpdated(Guid disasterId, CoordinationPointDto point) => Record("CoordinationPointUpdated", disasterId, point);
    public Task CoordinationPointDeleted(Guid disasterId, Guid pointId) => Record("CoordinationPointDeleted", disasterId, pointId);

    private Task Record(string method, Guid disasterId, object payload)
    {
        Notifications.Add(new Notification(method, disasterId, payload));
        return Task.CompletedTask;
    }
}
