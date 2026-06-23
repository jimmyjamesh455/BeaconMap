using System.Net;
using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Tests.Api;

public class DisasterEndpointsTests
{
    private static CreateDisasterRequest ValidRequest(string name = "Test Quake") => new(
        Name: name,
        Type: DisasterType.Earthquake,
        Area:
        [
            new LatLng(51.50, -0.13),
            new LatLng(51.50, -0.11),
            new LatLng(51.52, -0.12),
        ],
        Description: "epicentre downtown");

    [Fact]
    public async Task Post_disaster_returns_201_with_id()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/disasters", ValidRequest(), TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<DisasterDto>(TestApiFactory.Json);
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created!.Id);
        Assert.Equal("Test Quake", created.Name);
        Assert.Equal(DisasterType.Earthquake, created.Type);
    }

    [Fact]
    public async Task Post_disaster_with_empty_area_returns_400()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var bad = ValidRequest() with { Area = [] };
        var response = await client.PostAsJsonAsync("/api/disasters", bad, TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_disaster_with_too_few_area_points_returns_400()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var bad = ValidRequest() with { Area = [new LatLng(51.5, -0.1), new LatLng(51.5, -0.2)] };
        var response = await client.PostAsJsonAsync("/api/disasters", bad, TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Get_disasters_returns_saved_disasters()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/disasters", ValidRequest("Alpha"), TestApiFactory.Json);
        await client.PostAsJsonAsync("/api/disasters", ValidRequest("Bravo"), TestApiFactory.Json);

        var disasters = await client.GetFromJsonAsync<List<DisasterDto>>("/api/disasters", TestApiFactory.Json);

        Assert.NotNull(disasters);
        Assert.Equal(2, disasters!.Count);
        Assert.Contains(disasters, d => d.Name == "Alpha");
        Assert.Contains(disasters, d => d.Name == "Bravo");
    }

    [Fact]
    public async Task Get_disaster_returns_saved_area()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var created = await (await client.PostAsJsonAsync("/api/disasters", ValidRequest(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<DisasterDto>(TestApiFactory.Json);

        var fetched = await client.GetFromJsonAsync<DisasterDto>($"/api/disasters/{created!.Id}", TestApiFactory.Json);

        Assert.NotNull(fetched);
        // Ring is returned closed: 3 supplied points + repeated first.
        Assert.Equal(4, fetched!.Area.Length);
    }

    [Fact]
    public async Task Get_disaster_returns_404_when_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/disasters/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_disaster_updates_name()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var created = await (await client.PostAsJsonAsync("/api/disasters", ValidRequest("Old"), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<DisasterDto>(TestApiFactory.Json);

        var update = new UpdateDisasterRequest("New Name", DisasterType.Flood, ValidRequest().Area, "updated");
        var putResponse = await client.PutAsJsonAsync($"/api/disasters/{created!.Id}", update, TestApiFactory.Json);

        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);
        var fetched = await client.GetFromJsonAsync<DisasterDto>($"/api/disasters/{created.Id}", TestApiFactory.Json);
        Assert.Equal("New Name", fetched!.Name);
        Assert.Equal(DisasterType.Flood, fetched.Type);
    }

    [Fact]
    public async Task Delete_disaster_then_get_returns_404()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();
        var created = await (await client.PostAsJsonAsync("/api/disasters", ValidRequest(), TestApiFactory.Json))
            .Content.ReadFromJsonAsync<DisasterDto>(TestApiFactory.Json);

        var deleteResponse = await client.DeleteAsync($"/api/disasters/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/disasters/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_disaster_returns_404_when_missing()
    {
        using var factory = new TestApiFactory();
        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/disasters/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
