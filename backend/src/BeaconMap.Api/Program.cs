using System.Text.Json.Serialization;
using BeaconMap.Api.Endpoints;
using BeaconMap.Api.Persistence;
using BeaconMap.Api.RealTime;
using BeaconMap.Api.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Data Source=beaconmap.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString, x => x.UseNetTopologySuite()));

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.Configure<OpenRouteServiceOptions>(
    builder.Configuration.GetSection("OpenRouteService"));
builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IOptions<OpenRouteServiceOptions>>().Value);
builder.Services.AddHttpClient<IRouteProvider, OpenRouteServiceProvider>((sp, http) =>
{
    var options = sp.GetRequiredService<OpenRouteServiceOptions>();
    http.BaseAddress = new Uri(options.BaseUrl);
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<IMapNotifier, SignalRMapNotifier>();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapDisasterEndpoints();
app.MapHazardEndpoints();
app.MapCoordinationPointEndpoints();
app.MapRouteEndpoints();
app.MapHub<MapHub>("/hubs/map");

app.Run();

// Exposed so integration tests can use WebApplicationFactory<Program>.
public partial class Program { }
