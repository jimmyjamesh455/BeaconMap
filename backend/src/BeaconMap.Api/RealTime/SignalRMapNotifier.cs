using BeaconMap.Api.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace BeaconMap.Api.RealTime;

/// <summary>Sends map changes to the SignalR group for the affected disaster.</summary>
public class SignalRMapNotifier(IHubContext<MapHub> hub) : IMapNotifier
{
    public Task HazardCreated(Guid disasterId, HazardDto hazard) =>
        Send(disasterId, "HazardCreated", hazard);

    public Task HazardUpdated(Guid disasterId, HazardDto hazard) =>
        Send(disasterId, "HazardUpdated", hazard);

    public Task HazardDeleted(Guid disasterId, Guid hazardId) =>
        Send(disasterId, "HazardDeleted", hazardId);

    public Task CoordinationPointCreated(Guid disasterId, CoordinationPointDto point) =>
        Send(disasterId, "CoordinationPointCreated", point);

    public Task CoordinationPointUpdated(Guid disasterId, CoordinationPointDto point) =>
        Send(disasterId, "CoordinationPointUpdated", point);

    public Task CoordinationPointDeleted(Guid disasterId, Guid pointId) =>
        Send(disasterId, "CoordinationPointDeleted", pointId);

    private Task Send(Guid disasterId, string method, object payload) =>
        hub.Clients.Group(MapHub.GroupFor(disasterId)).SendAsync(method, payload);
}
