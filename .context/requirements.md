# Requirements — BeaconMap Routing App

A living record of what the application must do. Append or annotate; never delete entries.
Each entry notes if it supersedes an earlier one.

## R1 — Mark disasters (top-level events)
A responder can create a **disaster**: a top-level event with a name, a type
(Earthquake, Flood, Wildfire, Storm, Industrial, Other), and a **drawn affected area**
(polygon). The app supports **multiple disasters**; the user selects one to work in.
A disaster **scopes** all hazards, coordination points and routes.

## R2 — Record hazards
Within a selected disaster, a responder can record a **hazard** (BlockedRoad, UnsafeRoute,
Fire, DamagedBuilding, Other) as a **point with a danger radius** (metres). Default radius is
**100 m**, overridable per hazard. Every hazard blocks routing (no severity gate).

## R3 — Record coordination points
Within a selected disaster, a responder can record a **coordination point** (CommandPost,
MedicalStation, Shelter, Supply, Other) with a name and location, to cooperate with others.

## R4 — Auto-computed safe routes
Within a selected disaster, a responder can request a route between two points. The route is
**auto-computed and avoids ALL recorded hazards** in that disaster (each hazard circle becomes
an avoid-zone). Routing uses OpenRouteService (hosted) via `avoid_polygons`, proxied by the
backend. Default travel profile `driving-car`.

## R5 — Map-centred UI
The UI is centred on a map (Leaflet + OpenStreetMap). It is **responsive** and works on
desktop and mobile.

## R6 — Live updates
Changes (add/update/remove of hazards and coordination points) propagate **live** to other
responders viewing the same disaster (SignalR, per-disaster groups).

## Non-goals (MVP)
- Authentication / user accounts (planned later; no auth in MVP).
- Offline / disconnected operation (hosted ORS requires internet).
