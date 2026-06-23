using System.Net.Http.Json;
using BeaconMap.Api.Contracts;
using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Tests.Api;

internal static class ApiTestHelpers
{
    public static CreateDisasterRequest ValidDisaster(string name = "Test Quake") => new(
        Name: name,
        Type: DisasterType.Earthquake,
        Area:
        [
            new LatLng(51.50, -0.13),
            new LatLng(51.50, -0.11),
            new LatLng(51.52, -0.12),
        ],
        Description: null);

    public static async Task<Guid> CreateDisasterAsync(HttpClient client, string name = "Test Quake")
    {
        var response = await client.PostAsJsonAsync("/api/disasters", ValidDisaster(name), TestApiFactory.Json);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<DisasterDto>(TestApiFactory.Json);
        return created!.Id;
    }
}
