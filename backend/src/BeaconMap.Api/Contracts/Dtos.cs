using BeaconMap.Api.Domain;

namespace BeaconMap.Api.Contracts;

/// <summary>A WGS84 coordinate in the frontend-friendly lat/lng order.</summary>
public record LatLng(double Lat, double Lng);

// ----- Disaster -----

public record CreateDisasterRequest(
    string Name,
    DisasterType Type,
    LatLng[] Area,
    string? Description);

public record UpdateDisasterRequest(
    string Name,
    DisasterType Type,
    LatLng[] Area,
    string? Description);

public record DisasterDto(
    Guid Id,
    string Name,
    DisasterType Type,
    LatLng[] Area,
    string? Description,
    DateTime CreatedAtUtc);

// ----- Hazard -----

public record CreateHazardRequest(
    HazardType Type,
    double Lat,
    double Lng,
    double? RadiusMeters,
    string? Description);

public record UpdateHazardRequest(
    HazardType Type,
    double Lat,
    double Lng,
    double? RadiusMeters,
    string? Description);

public record HazardDto(
    Guid Id,
    Guid DisasterId,
    HazardType Type,
    double Lat,
    double Lng,
    double RadiusMeters,
    string? Description,
    DateTime CreatedAtUtc);

// ----- Coordination point -----

public record CreateCoordinationPointRequest(
    string Name,
    CoordinationPointType Type,
    double Lat,
    double Lng,
    string? Description);

public record UpdateCoordinationPointRequest(
    string Name,
    CoordinationPointType Type,
    double Lat,
    double Lng,
    string? Description);

public record CoordinationPointDto(
    Guid Id,
    Guid DisasterId,
    string Name,
    CoordinationPointType Type,
    double Lat,
    double Lng,
    string? Description,
    DateTime CreatedAtUtc);

// ----- Route -----

public record RouteRequestDto(LatLng? Start, LatLng? End, string? Profile);

public record RouteDto(LatLng[] Coordinates, double DistanceMeters, double DurationSeconds);
