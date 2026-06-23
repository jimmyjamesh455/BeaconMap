using System.Net;
using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Tests.Api;

public class CoordinationPointEndpointsTests
{
    private static CreateCoordinationPointRequest ValidPoint(string name = "Forward Command") =>
        new(Name: name, Type: CoordinationPointType.CommandPost, Lat: 51.52, Lng: -0.10, Description: null);

    [Fact]
    public async Task Post_coordination_point_returns_201_with_id()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/coordination-points", ValidPoint(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CoordinationPointDto>(TestApiFactory.Json);
        Assert.NotNull(created);
        Assert.Equal(disasterId, created!.DisasterId);
        Assert.Equal("Forward Command", created.Name);
    }

    [Fact]
    public async Task Post_coordination_point_with_blank_name_returns_400()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{disasterId}/coordination-points", ValidPoint(name: "  "), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_coordination_point_returns_404_when_disaster_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/api/disasters/{Guid.NewGuid()}/coordination-points", ValidPoint(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_coordination_points_returns_only_this_disasters()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterA = await ApiTestHelpers.CreateDisasterAsync(client, "A");
        var disasterB = await ApiTestHelpers.CreateDisasterAsync(client, "B");
        await client.PostAsJsonAsync($"/api/disasters/{disasterA}/coordination-points", ValidPoint("CP1"), TestApiFactory.Json);
        await client.PostAsJsonAsync($"/api/disasters/{disasterB}/coordination-points", ValidPoint("CP2"), TestApiFactory.Json);

        var pointsA = await client.GetFromJsonAsync<List<CoordinationPointDto>>(
            $"/api/disasters/{disasterA}/coordination-points", TestApiFactory.Json);

        var point = Assert.Single(pointsA!);
        Assert.Equal("CP1", point.Name);
        Assert.Equal(disasterA, point.DisasterId);
    }

    [Fact]
    public async Task Delete_coordination_point_then_get_list_excludes_it()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var disasterId = await ApiTestHelpers.CreateDisasterAsync(client);
        var created = await (await client.PostAsJsonAsync(
                $"/api/disasters/{disasterId}/coordination-points", ValidPoint(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<CoordinationPointDto>(TestApiFactory.Json);

        var deleteResponse = await client.DeleteAsync(
            $"/api/disasters/{disasterId}/coordination-points/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var points = await client.GetFromJsonAsync<List<CoordinationPointDto>>(
            $"/api/disasters/{disasterId}/coordination-points", TestApiFactory.Json);
        Assert.Empty(points!);
    }
}
