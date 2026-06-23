using BeaconMap.Api.Contracts;
using NetTopologySuite;
using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Geometry;

/// <summary>
/// Maps between frontend lat/lng DTOs and stored NTS geometries. DB geometries use SRID 0
/// (see decision D9); coordinates are always raw WGS84 lng/lat.
/// </summary>
public static class Spatial
{
    public static readonly GeometryFactory Factory =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 0);

    public static Point Point(double lat, double lng) =>
        Factory.CreatePoint(new Coordinate(lng, lat));

    public static Point Point(LatLng p) => Point(p.Lat, p.Lng);

    /// <summary>Builds a polygon from a lat/lng ring, closing it if the caller left it open.</summary>
    public static Polygon Polygon(IReadOnlyList<LatLng> ring)
    {
        ArgumentNullException.ThrowIfNull(ring);
        ArgumentOutOfRangeException.ThrowIfLessThan(ring.Count, 3);

        var coordinates = ring.Select(p => new Coordinate(p.Lng, p.Lat)).ToList();
        if (!coordinates[0].Equals2D(coordinates[^1]))
        {
            coordinates.Add(coordinates[0].Copy());
        }

        return Factory.CreatePolygon(coordinates.ToArray());
    }

    public static LatLng ToLatLng(Point point) => new(point.Y, point.X);

    public static LatLng[] ToLatLngRing(Polygon polygon) =>
        polygon.ExteriorRing.Coordinates.Select(c => new LatLng(c.Y, c.X)).ToArray();
}
