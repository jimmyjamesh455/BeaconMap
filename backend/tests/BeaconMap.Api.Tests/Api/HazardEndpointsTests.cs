using System.Net;
using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Tests.Api;

public class HazardEndpointsTests
{
    private static CreateHazardRequest ValidHazard(double? radius = 250) =>
        new(HazardType.Fire, Lat: 51.51, Lng: -0.13, RadiusMeters: radius, Description: "warehouse fire");

    [Fact]
    public async Task Post_hazard_returns_201_with_id()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/hazards", ValidHazard(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<HazardDto>(TestApiFactory.Json);
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created!.Id);
        Assert.Equal(disasterId, created.DisasterId);
        Assert.Equal(250, created.RadiusMeters);
    }

    [Fact]
    public async Task Post_hazard_defaults_radius_to_100_when_omitted()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/hazards", ValidHazard(radius: null), TestApiFactory.Json);

        var created = await response.Content.ReadFromJsonAsync<HazardDto>(TestApiFactory.Json);
        Assert.Equal(100, created!.RadiusMeters);
    }

    [Fact]
    public async Task Post_hazard_with_zero_radius_returns_400()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/hazards", ValidHazard(radius: 0), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_hazard_with_radius_over_5000_returns_400()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/hazards", ValidHazard(radius: 6000), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_hazard_returns_404_when_disaster_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{Guid.NewGuid()}/hazards", ValidHazard(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_hazards_returns_only_this_disasters_hazards()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterA = await ApiTestHelpers.CreateDisasterAsync(client, "A");
        var disasterB = await ApiTestHelpers.CreateDisasterAsync(client, "B");
        await client.PostAsJsonAsync($"/api/disasters/{disasterA}/hazards", ValidHazard(), TestApiFactory.Json);
        await client.PostAsJsonAsync($"/api/disasters/{disasterA}/hazards", ValidHazard(), TestApiFactory.Json);
        await client.PostAsJsonAsync($"/api/disasters/{disasterB}/hazards", ValidHazard(), TestApiFactory.Json);

        var hazardsA = await client.GetFromJsonAsync<List<HazardDto>>(
            $"/api/disasters/{disasterA}/hazards", TestApiFactory.Json);

        Assert.Equal(2, hazardsA!.Count);
        Assert.All(hazardsA, h => Assert.Equal(disasterA, h.DisasterId));
    }

    [Fact]
    public async Task Get_hazards_returns_404_when_disaster_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/disasters/{Guid.NewGuid()}/hazards");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_hazard_then_get_list_excludes_it()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);
        var created = await (await client.PostAsJsonAsync(
                $"/api/disasters/{disasterId}/hazards", ValidHazard(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<HazardDto>(TestApiFactory.Json);

        var deleteResponse = await client.DeleteAsync($"/api/disasters/{disasterId}/hazards/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var hazards = await client.GetFromJsonAsync<List<HazardDto>>(
            $"/api/disasters/{disasterId}/hazards", TestApiFactory.Json);
        Assert.Empty(hazards!);
    }

    [Fact]
    public async Task Delete_hazard_returns_404_when_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.DeleteAsync($"/api/disasters/{disasterId}/hazards/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
