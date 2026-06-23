using BeaconMap.Api.Geometry;
using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Tests.Geometry;

public class CircleToPolygonTests
{
    // London-ish reference point.
    private const double CentreLat = 51.5074;
    private const double CentreLng = -0.1278;
    private const double EarthRadiusMeters = 6_371_000.0;

    [Fact]
    public void CircleToPolygon_returns_closed_ring()
    {
        var polygon = CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: 100, segments: 32);

        var coords = polygon.ExteriorRing.Coordinates;
        Assert.Equal(coords[0], coords[^1]);
    }

    [Fact]
    public void CircleToPolygon_produces_requested_segment_count()
    {
        var polygon = CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: 100, segments: 32);

        // A closed ring of N segments has N+1 coordinates (first repeated at the end).
        Assert.Equal(33, polygon.ExteriorRing.Coordinates.Length);
    }

    [Fact]
    public void CircleToPolygon_vertex_distance_approximates_radius()
    {
        const double radius = 250;
        var polygon = CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: radius, segments: 64);

        foreach (var c in polygon.ExteriorRing.Coordinates)
        {
            var d = HaversineMeters(CentreLat, CentreLng, c.Y, c.X);
            Assert.InRange(d, radius * 0.99, radius * 1.01);
        }
    }

    [Fact]
    public void CircleToPolygon_sets_srid_4326()
    {
        var polygon = CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: 100, segments: 32);

        Assert.Equal(4326, polygon.SRID);
    }

    [Fact]
    public void CircleToPolygon_rejects_non_positive_radius()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: 0, segments: 32));
    }

    [Fact]
    public void CircleToPolygon_rejects_fewer_than_three_segments()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => CircleToPolygon.Create(CentreLat, CentreLng, radiusMeters: 100, segments: 2));
    }

    private static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
    {
        double ToRad(double d) => d * Math.PI / 180.0;
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return EarthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
