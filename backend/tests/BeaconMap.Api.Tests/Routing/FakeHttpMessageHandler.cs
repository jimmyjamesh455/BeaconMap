using System.Net;

namespace BeaconMap.Api.Tests.Routing;

/// <summary>
/// A test double that captures the outgoing request and returns a canned response, so the
/// OpenRouteService provider can be tested without hitting the real API.
/// </summary>
public sealed class FakeHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    public HttpRequestMessage? LastRequest { get; private set; }
    public string? LastRequestBody { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        if (request.Content is not null)
        {
            LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);
        }

        return response;
    }

    public static FakeHttpMessageHandler WithJson(string json, HttpStatusCode status = HttpStatusCode.OK) =>
        new(new HttpResponseMessage(status)
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
        });
}
