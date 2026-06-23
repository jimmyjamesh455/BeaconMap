using BeaconMap.Api.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Tests.Persistence;

/// <summary>
/// An isolated in-memory SQLite database (spatial enabled) shared across the contexts created
/// within a single test. The connection is kept open for the lifetime of the database.
/// </summary>
public sealed class SqliteSpatialFixture : IDisposable
{
    private readonly SqliteConnection _connection;

    // DB geometries use SRID 0 to match the SpatiaLite columns EF creates (raw lng/lat is
    // what matters; SRID is internal metadata never sent to ORS/Leaflet).
    public static readonly GeometryFactory Geometry =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 0);

    static SqliteSpatialFixture()
    {
        // Initialise the native SQLite provider for the raw connections we open in tests.
        SQLitePCL.Batteries_V2.Init();
    }

    public SqliteSpatialFixture()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using var ctx = CreateContext();
        ctx.Database.EnsureCreated();
    }

    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection, x => x.UseNetTopologySuite())
            .Options;
        return new AppDbContext(options);
    }

    public static Point Point(double lat, double lng) => Geometry.CreatePoint(new Coordinate(lng, lat));

    /// <summary>A small square polygon centred near the given point (degrees).</summary>
    public static Polygon Square(double lat, double lng, double halfSize = 0.01)
    {
        var ring = Geometry.CreateLinearRing(
        [
            new Coordinate(lng - halfSize, lat - halfSize),
            new Coordinate(lng + halfSize, lat - halfSize),
            new Coordinate(lng + halfSize, lat + halfSize),
            new Coordinate(lng - halfSize, lat + halfSize),
            new Coordinate(lng - halfSize, lat - halfSize),
        ]);
        return Geometry.CreatePolygon(ring);
    }

    public void Dispose() => _connection.Dispose();
}
