# BeaconMap Routing App

A map-centred tool for emergency disaster response teams. Responders mark a **disaster**
(a typed, polygon-area event that scopes everything), record **hazards** (point + danger
radius) and **coordination points**, and request **safe routes** that are auto-computed to
avoid every recorded hazard. Changes propagate **live** to everyone viewing the same disaster.

## Stack

- **Backend:** ASP.NET Core (.NET 9) minimal API, EF Core + SQLite (NetTopologySuite spatial),
  SignalR for live updates, OpenRouteService for hazard-avoiding routing.
- **Frontend:** Vue 3 + TypeScript + Vite, Pinia, Leaflet + OpenStreetMap.

See [`.context/`](.context/) for requirements, decisions, and current state.

## Prerequisites

- .NET SDK 9
- Node.js LTS

## Configure

Set an OpenRouteService API key (free tier) so routing works. Either edit
`backend/src/BeaconMap.Api/appsettings.json` (`OpenRouteService:ApiKey`) or use
user-secrets:

```powershell
cd backend/src/BeaconMap.Api
dotnet user-secrets init
dotnet user-secrets set "OpenRouteService:ApiKey" "<your-key>"
```

Without a key, everything works except route computation (the route endpoint returns 502).

The frontend reads the API base URL from `VITE_API_BASE_URL` (see `frontend/.env.example`,
default `http://localhost:5180`).

## Run

Backend (creates/migrates `beaconmap.db` on startup):

```powershell
cd backend/src/BeaconMap.Api
dotnet run
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, click **+ New** to create a disaster (click the map ≥3 times to outline its
area), then use **Add hazard / Add point** and the **Safe route** panel.

## Test

```powershell
# Backend
dotnet test

# Frontend
cd frontend
npm run test
```

## Project layout

```
backend/src/BeaconMap.Api    API, domain, persistence, routing, realtime
backend/tests/...Tests              xUnit unit + integration tests
frontend/src                        api client, stores, map adapter, components
.context/                           requirements.md, decisions.md, state.md
```
