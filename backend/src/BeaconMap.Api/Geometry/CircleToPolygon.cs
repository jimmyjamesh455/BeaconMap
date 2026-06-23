using NetTopologySuite.Geometries;

namespace BeaconMap.Api.Geometry;

/// <summary>
/// Converts a centre point + danger radius into a polygon approximation, for use as a
/// routing avoid-zone. Returns an SRID 4326 (WGS84) polygon.
/// </summary>
public static class CircleToPolygon
{
    private const double EarthRadiusMeters = 6_371_000.0;

    private static readonly GeometryFactory Factory =
        new(new PrecisionModel(), srid: 4326);

    public static Polygon Create(double centreLat, double centreLng, double radiusMeters, int segments = 32)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(radiusMeters, 0);
        ArgumentOutOfRangeException.ThrowIfLessThan(segments, 3);

        var coordinates = new Coordinate[segments + 1];
        var latRad = ToRadians(centreLat);
        var lngRad = ToRadians(centreLng);
        var angularDistance = radiusMeters / EarthRadiusMeters;

        for (var i = 0; i < segments; i++)
        {
            // Walk counter-clockwise so the exterior ring follows GeoJSON/OGC convention.
            var bearing = 2 * Math.PI * i / segments;

            var pointLat = Math.Asin(
                Math.Sin(latRad) * Math.Cos(angularDistance) +
                Math.Cos(latRad) * Math.Sin(angularDistance) * Math.Cos(bearing));

            var pointLng = lngRad + Math.Atan2(
                Math.Sin(bearing) * Math.Sin(angularDistance) * Math.Cos(latRad),
                Math.Cos(angularDistance) - Math.Sin(latRad) * Math.Sin(pointLat));

            coordinates[i] = new Coordinate(ToDegrees(pointLng), ToDegrees(pointLat));
        }

        // Close the ring.
        coordinates[segments] = coordinates[0].Copy();

        return Factory.CreatePolygon(coordinates);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

    private static double ToDegrees(double radians) => radians * 180.0 / Math.PI;
}
