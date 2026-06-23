using System.Text.Json;
using System.Text.Json.Serialization;
using BeaconMap.Api.Persistence;
using BeaconMap.Api.RealTime;
using BeaconMap.Api.Routing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BeaconMap.Api.Tests.Api;

/// <summary>
/// Spins up the API in-process backed by an isolated in-memory SQLite database (spatial),
/// so endpoint behaviour is exercised end-to-end without external infrastructure.
/// </summary>
public class TestApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>Optional stub used to replace the real routing provider in tests.</summary>
    public IRouteProvider? RouteProviderOverride { get; set; }

    /// <summary>Optional spy used to replace the real SignalR map notifier in tests.</summary>
    public IMapNotifier? MapNotifierOverride { get; set; }

    public TestApiFactory()
    {
        SQLitePCL.Batteries_V2.Init();
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var toRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                            || d.ServiceType == typeof(DbContextOptions)
                            || d.ServiceType == typeof(AppDbContext))
                .ToList();
            foreach (var d in toRemove)
            {
                services.Remove(d);
            }

            services.AddDbContext<AppDbContext>(o =>
                o.UseSqlite(_connection, x => x.UseNetTopologySuite()));

            if (RouteProviderOverride is not null)
            {
                var routeDescriptors = services
                    .Where(d => d.ServiceType == typeof(IRouteProvider))
                    .ToList();
                foreach (var d in routeDescriptors)
                {
                    services.Remove(d);
                }

                services.AddSingleton(RouteProviderOverride);
            }

            if (MapNotifierOverride is not null)
            {
                var notifierDescriptors = services
                    .Where(d => d.ServiceType == typeof(IMapNotifier))
                    .ToList();
                foreach (var d in notifierDescriptors)
                {
                    services.Remove(d);
                }

                services.AddSingleton(MapNotifierOverride);
            }

            // Schema is applied by the app's own startup migration against this connection.
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}
