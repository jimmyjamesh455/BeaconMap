# State — BeaconMap Routing App

**Read this first.** Updated at the end of each working session / milestone.

## Complete and tested
- **Backend (50 xUnit tests green):**
  - Geometry: `CircleToPolygon` (circle → SRID-4326 polygon for avoid-zones).
  - Persistence: `AppDbContext` (SQLite + NetTopologySuite), InitialCreate migration, cascade.
  - Disaster CRUD: `/api/disasters` (GET/GET{id}/POST/PUT/DELETE) with area validation.
  - Hazard CRUD: `/api/disasters/{id}/hazards` (scoped, 100 m default radius, 404/400 cases).
  - Coordination-point CRUD: `/api/disasters/{id}/coordination-points` (scoped).
  - Routing: `OpenRouteServiceProvider` (avoid_polygons, fake-HTTP-handler tested) +
    `POST /api/disasters/{id}/routes` (loads that disaster's hazards, 400/404/502 cases).
  - Live updates: `MapHub` (per-disaster groups) + `IMapNotifier`; write endpoints notify.
  - Startup migration applies schema to the SQLite file DB.
- **Frontend (19 Vitest tests green):**
  - Typed API client (mocked-fetch tested).
  - Pinia stores: disasters / hazards / coordinationPoints / route, incl. live-event handlers
    (upsert/dedup/remove) and active-disaster selection.
  - `MapAdapter` interface + `LeafletMapAdapter`; `MapView` tested with a fake adapter
    (store→map sync + click emission).
  - SignalR client wrapper (`createMapHub`).
  - Components: DisasterPicker, DisasterForm, HazardForm, CoordinationPointForm, RoutePanel,
    MapView; App wires modes/forms/route flow. Responsive sidebar + map layout.
  - `npm run build` (vue-tsc type-check + bundle) passes.
- **Runtime verified:** backend boots, creates DB, full disaster→hazard→point→list flow works,
  route endpoint returns 502 gracefully without an ORS key; frontend dev server serves the app.

## In progress
- None — MVP feature-complete.

## Not yet started / future
- Authentication & edit attribution (explicitly out of MVP scope).
- Offline/disconnected operation; migrate SQLite → PostGIS if scaling.
- Optional walking profile in the UI (backend already accepts any ORS profile).

## Known issues
- Routing requires an OpenRouteService API key + internet; without a key the route endpoint
  returns 502 (handled in the UI with an error message).
- Vite build prints harmless `/*#__PURE__*/` annotation warnings from `@microsoft/signalr`.

## Environment notes
- Toolchains are user-scoped (decision D8). dotnet at `%LOCALAPPDATA%\Microsoft\dotnet`
  (also on user PATH + DOTNET_ROOT); node under
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v24.17.0-win-x64`.
- `dotnet-ef` global tool pinned to 9.x.
- Project lives under a OneDrive-synced folder — occasional file-lock flakiness during builds.

## Open questions
- Travel profile(s) to expose in the UI — driving only, or also walking? (defaults to driving-car.)

## Next recommended step
- Set an ORS API key and do the manual browser smoke (two browsers on one disaster to see live
  updates), then consider authentication as the first post-MVP feature.
