using Microsoft.AspNetCore.SignalR;

namespace BeaconMap.Api.RealTime;

/// <summary>
/// Live map updates. Clients join the group for the disaster they are viewing so they only
/// receive changes scoped to that incident.
/// </summary>
public class MapHub : Hub
{
    public static string GroupFor(Guid disasterId) => $"disaster-{disasterId}";

    public Task JoinDisaster(Guid disasterId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(disasterId));

    public Task LeaveDisaster(Guid disasterId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(disasterId));
}
