using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Tests.Api;

public class MapNotificationTests
{
    private static CreateHazardRequest Hazard() =>
        new(HazardType.Fire, 51.51, -0.13, RadiusMeters: 150, Description: null);

    private static CreateCoordinationPointRequest Point() =>
        new("Forward Command", CoordinationPointType.CommandPost, 51.52, -0.10, null);

    [Fact]
    public async Task Creating_hazard_notifies_disaster_group()
    {
        var spy = new SpyMapNotifier();
        using var factory = new TestApiFactory { MapNotifierOverride = spy };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        await client.PostAsJsonAsync($"/api/disasters/{disasterId}/hazards", Hazard(), TestApiFactory.Json);

        var notification = Assert.Single(spy.Notifications);
        Assert.Equal("HazardCreated", notification.Method);
        Assert.Equal(disasterId, notification.DisasterId);
        Assert.Equal(disasterId, Assert.IsType<HazardDto>(notification.Payload).DisasterId);
    }

    [Fact]
    public async Task Deleting_hazard_notifies_disaster_group_with_id()
    {
        var spy = new SpyMapNotifier();
        using var factory = new TestApiFactory { MapNotifierOverride = spy };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);
        var created = await (await client.PostAsJsonAsync(
                $"/api/disasters/{disasterId}/hazards", Hazard(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<HazardDto>(TestApiFactory.Json);

        await client.DeleteAsync($"/api/disasters/{disasterId}/hazards/{created!.Id}");

        var deleted = spy.Notifications.Single(n => n.Method == "HazardDeleted");
        Assert.Equal(disasterId, deleted.DisasterId);
        Assert.Equal(created.Id, Assert.IsType<Guid>(deleted.Payload));
    }

    [Fact]
    public async Task Creating_coordination_point_notifies_disaster_group()
    {
        var spy = new SpyMapNotifier();
        using var factory = new TestApiFactory { MapNotifierOverride = spy };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        await client.PostAsJsonAsync($"/api/disasters/{disasterId}/coordination-points", Point(), TestApiFactory.Json);

        var notification = Assert.Single(spy.Notifications);
        Assert.Equal("CoordinationPointCreated", notification.Method);
        Assert.Equal(disasterId, notification.DisasterId);
    }

    [Fact]
    public async Task Deleting_coordination_point_notifies_disaster_group()
    {
        var spy = new SpyMapNotifier();
        using var factory = new TestApiFactory { MapNotifierOverride = spy };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);
        var created = await (await client.PostAsJsonAsync(
                $"/api/disasters/{disasterId}/coordination-points", Point(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<CoordinationPointDto>(TestApiFactory.Json);

        await client.DeleteAsync($"/api/disasters/{disasterId}/coordination-points/{created!.Id}");

        var deleted = spy.Notifications.Single(n => n.Method == "CoordinationPointDeleted");
        Assert.Equal(disasterId, deleted.DisasterId);
        Assert.Equal(created.Id, Assert.IsType<Guid>(deleted.Payload));
    }
}
