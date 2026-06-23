using BeaconMap.Api.Contracts;

namespace BeaconMap.Api.RealTime;

/// <summary>
/// Broadcasts map changes to clients viewing a disaster. Abstracted so write endpoints can be
/// tested without a live SignalR connection.
/// </summary>
public interface IMapNotifier
{
    Task HazardCreated(Guid disasterId, HazardDto hazard);
    Task HazardUpdated(Guid disasterId, HazardDto hazard);
    Task HazardDeleted(Guid disasterId, Guid hazardId);

    Task CoordinationPointCreated(Guid disasterId, CoordinationPointDto point);
    Task CoordinationPointUpdated(Guid disasterId, CoordinationPointDto point);
    Task CoordinationPointDeleted(Guid disasterId, Guid pointId);
}
