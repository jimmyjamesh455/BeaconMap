using System.Net;
using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;
using BeaconMap.Api.Routing;

namespace BeaconMap.Api.Tests.Api;

public class RouteEndpointsTests
{
    private static CreateHazardRequest Hazard(double lat, double lng) =>
        new(HazardType.Fire, lat, lng, RadiusMeters: 150, Description: null);

    private static RouteRequestDto ValidRoute() =>
        new(new LatLng(51.50, -0.13), new LatLng(51.52, -0.10), Profile: null);

    [Fact]
    public async Task Post_route_includes_only_this_disasters_hazards_as_avoid_zones()
    {
        var stub = new StubRouteProvider();
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();
        var disasterA = await ApiTestHelpers.CreateDisasterAsync(client, "A");
        var disasterB = await ApiTestHelpers.CreateDisasterAsync(client, "B");
        await client.PostAsJsonAsync($"/api/disasters/{disasterA}/hazards", Hazard(51.50, -0.12), TestApiFactory.Json);
        await client.PostAsJsonAsync($"/api/disasters/{disasterA}/hazards", Hazard(51.51, -0.11), TestApiFactory.Json);
        await client.PostAsJsonAsync($"/api/disasters/{disasterB}/hazards", Hazard(51.49, -0.14), TestApiFactory.Json);

        var response = await client.PostAsJsonAsync($"/api/disasters/{disasterA}/routes", ValidRoute(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(stub.LastAvoidZones);
        Assert.Equal(2, stub.LastAvoidZones!.Count);
    }

    [Fact]
    public async Task Post_route_defaults_profile_to_driving_car()
    {
        var stub = new StubRouteProvider();
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        await client.PostAsJsonAsync($"/api/disasters/{disasterId}/routes", ValidRoute(), TestApiFactory.Json);

        Assert.Equal("driving-car", stub.LastProfile);
    }

    [Fact]
    public async Task Post_route_returns_route_coordinates()
    {
        var stub = new StubRouteProvider(new RouteResult(
            [new RoutePoint(51.50, -0.13), new RoutePoint(51.52, -0.10)],
            DistanceMeters: 2500,
            DurationSeconds: 300));
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync($"/api/disasters/{disasterId}/routes", ValidRoute(), TestApiFactory.Json);
        var route = await response.Content.ReadFromJsonAsync<RouteDto>(TestApiFactory.Json);

        Assert.Equal(2, route!.Coordinates.Length);
        Assert.Equal(2500, route.DistanceMeters);
        Assert.Equal(300, route.DurationSeconds);
    }

    [Fact]
    public async Task Post_route_returns_400_for_missing_coordinates()
    {
        var stub = new StubRouteProvider();
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var bad = new RouteRequestDto(null, new LatLng(51.52, -0.10), null);
        var response = await client.PostAsJsonAsync($"/api/disasters/{disasterId}/routes", bad, TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_route_returns_404_when_disaster_missing()
    {
        var stub = new StubRouteProvider();
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/api/disasters/{Guid.NewGuid()}/routes", ValidRoute(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Post_route_returns_502_when_provider_fails()
    {
        var stub = new StubRouteProvider(toThrow: new RouteProviderException("upstream down"));
        using var factory = new TestApiFactory { RouteProviderOverride = stub };
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync($"/api/disasters/{disasterId}/routes", ValidRoute(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }
}
