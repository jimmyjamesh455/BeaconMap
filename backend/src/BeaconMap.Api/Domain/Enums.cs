namespace BeaconMap.Api.Domain;

public enum DisasterType
{
    Earthquake,
    Flood,
    Wildfire,
    Storm,
    Industrial,
    Other,
    // Appended (kept last) so existing stored enum ordinals stay stable.
    Eruption,
    Tsunami,
}

public enum HazardType
{
    BlockedRoad,
    UnsafeRoute,
    Fire,
    DamagedBuilding,
    Other,
}

public enum CoordinationPointType
{
    CommandPost,
    MedicalStation,
    Shelter,
    Supply,
    Other,
}
