# Decisions — BeaconMap Routing App

Significant architectural/design decisions. Each entry: what was decided, alternatives, why,
trade-offs. Do not delete; append.

## D1 — ASP.NET Core Web API (C#) backend

Decided to build the backend as an ASP.NET Core Web API (.NET 9, minimal APIs).

Alternatives considered:
- Node.js/Express backend
- Serverless (Azure Functions)

Why chosen:
- User specified C#.
- Minimal APIs keep endpoint code small and testable with `WebApplicationFactory`.
- First-class SignalR support for live updates.

Trade-offs:
- Another runtime to host vs an all-JS stack.

## D2 — Vue 3 + TypeScript + Vite frontend

Decided on Vue 3 (Composition API) + TypeScript, built with Vite; Pinia for state.

Alternatives considered: React, plain JS.

Why chosen: user specified Vue; Vite gives fast dev + Vitest test integration; Pinia stores
are easily unit-testable.

Trade-offs: none significant for this project.

## D3 — Leaflet + OpenStreetMap for mapping

Alternatives: Mapbox GL, MapLibre GL.

Why chosen: free, no API key/billing, mature, good mobile support; sufficient for markers,
circles, polygons and polylines.

Trade-offs: raster tiles (vs vector); heavy custom styling is harder. Acceptable for MVP.

## D4 — SQLite + EF Core + NetTopologySuite (spatial)

Alternatives: PostgreSQL+PostGIS, SQL Server.

Why chosen: zero-setup for the MVP; EF Core + NetTopologySuite gives real geometry types
(Point, Polygon); SQLite NTS support ships mod_spatialite as a transitive package. Can migrate
to PostGIS later behind the same EF Core model.

Trade-offs: weaker geospatial querying than PostGIS; single-writer concurrency. Fine for MVP.

## D5 — OpenRouteService (hosted) for hazard-avoiding routing

Alternatives: self-hosted ORS, GraphHopper, custom graph traversal.

Why chosen: hosted ORS Directions API supports `avoid_polygons` out of the box — pass hazard
circles (converted to polygons) and it routes around them. Fastest path to the core feature.
Free tier confirmed acceptable. Backend proxies ORS so the API key stays server-side and we
can inject hazards + test with a fake `HttpMessageHandler`.

Trade-offs: external dependency + internet required; free-tier rate limits; no offline.

## D6 — Disaster as top-level scope; hazards/points as point+radius; all hazards block

Decided: a Disaster is a typed, polygon-area, top-level entity that scopes all other data
(multi-disaster app). Hazards and coordination points are points; hazards carry a danger
radius (default 100 m). ALL hazards become routing avoid-zones (no severity gate).

Alternatives considered: disaster as a plain marker / single-disaster app; hazards as polygons
or lines; severity-gated avoidance.

Why chosen: matches how responders scope work to one incident; point+radius is fastest to
place on mobile; "all block" keeps routing predictable for the MVP.

Trade-offs: a minor hazard can still reroute traffic; polygon-only hazards would map more
precisely but are clunky to place. Revisit severity/geometry post-MVP.

## D7 — SignalR with per-disaster groups for live updates

Alternatives: client polling; global broadcast.

Why chosen: SignalR is native to ASP.NET Core; per-disaster groups keep traffic scoped to the
incident a responder is viewing. Notifications go through an `IMapNotifier` abstraction so
write endpoints are testable without a live socket.

Trade-offs: WebSocket infra to operate; mocked in tests rather than exercised end-to-end.

## D8 — Toolchain installed to user scope (no admin available)

The dev machine had neither the .NET SDK nor Node.js, and machine-wide installers require
admin elevation (UAC), which is unavailable in this environment.

Decided: install .NET SDK 9 via the official `dotnet-install` script into
`%LOCALAPPDATA%\Microsoft\dotnet`, and Node.js LTS via `winget --scope user`. dotnet added to
the user PATH + `DOTNET_ROOT`.

Trade-offs: user-scoped tools; new shells must pick up the updated PATH.

## D9 — DB geometries stored with SRID 0 (not 4326)

EF Core's SQLite/SpatiaLite migration creates geometry columns with SRID 0, and SpatiaLite
enforces it (inserting SRID 4326 fails with "geom-type or SRID not allowed"). EF Core SQLite
has no fluent SRID configuration.

Decided: store all DB geometries with **SRID 0**. Coordinates are always raw lng/lat (WGS84),
which is what we send to ORS and Leaflet; SRID is internal metadata that never leaves the DB.
`CircleToPolygon` keeps SRID 4326 because it is built fresh for ORS `avoid_polygons` and is
never round-tripped through the database.

Alternatives: PostGIS (proper SRID support) — deferred to post-MVP per D4.

Trade-offs: a cosmetic SRID mismatch between stored geometries (0) and routing geometries
(4326); harmless because we never perform NTS spatial operations across the two.

## D10 — SQLitePCL provider initialisation

`Microsoft.EntityFrameworkCore.Sqlite.NetTopologySuite` pulls `Sqlite.Core`, which does not
auto-initialise the native SQLite provider. Added `SQLitePCLRaw.bundle_e_sqlite3` to both the
API and test projects; tests also call `SQLitePCL.Batteries_V2.Init()` before opening raw
connections. The `dotnet-ef` global tool is pinned to 9.x to match the .NET 9 SDK.
