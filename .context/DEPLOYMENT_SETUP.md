# BeaconMap Deployment Setup

Implements the single-App-Service pattern from [DEPLOYMENT_PIPELINE.md](./DEPLOYMENT_PIPELINE.md):
the Vue SPA is built into the .NET API's `wwwroot`, and the API is the only deployed runtime,
serving both `/api/*` and the SPA.

## What was provisioned (Azure CLI)

| Resource | Value |
|---|---|
| Subscription | `e8a6b5ab-456f-4c37-a3c1-0455dc68af88` |
| Resource group | `beaconmap-rg` |
| App Service plan | `beaconmap-plan-ukwest` (Linux, **Free F1**) |
| Web app | `beaconmap` → https://beaconmap.azurewebsites.net |
| Region | **UK West** |
| Runtime | DOTNETCORE:9.0 |

> Region note: UK South had **0 VM quota** on this subscription, so the plan was created in
> UK West, where Free-tier quota was available. The Free (F1) tier was used because dedicated
> tiers (B1+) also require VM quota this subscription does not currently have. To move to B1
> (Always On, no daily CPU cap), request a quota increase, then
> `az appservice plan update --name beaconmap-plan-ukwest -g beaconmap-rg --sku B1`.

### SpatiaLite startup command

The DB uses NetTopologySuite over SQLite, which loads the `mod_spatialite` native extension when
a connection opens. The Linux App Service image does not ship it, so the app's startup command
installs it before launching:

```
apt-get update && apt-get install -y libsqlite3-mod-spatialite && dotnet BeaconMap.Api.dll
```

(Set via `az webapp config set --startup-file ...`. CI installs the same package before tests.)

## GitHub repository secrets (add manually)

`gh` CLI is not installed locally, so add these in
**GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `AZURE_CREDENTIALS` | The full service-principal JSON (provided separately — do not commit it) |

No `VITE_API_BASE_URL` secret is needed: the production build defaults to a
same-origin API base URL (see `frontend/src/api/client.ts`). Set the secret only
if you ever need to point the SPA at a different API host.

The service principal is `github-beaconmap`, scoped Contributor on `beaconmap-rg`.
To regenerate its credentials:

```bash
az ad sp create-for-rbac --name "github-beaconmap" --role contributor \
  --scopes /subscriptions/e8a6b5ab-456f-4c37-a3c1-0455dc68af88/resourceGroups/beaconmap-rg \
  --sdk-auth
```

## Runtime app settings (optional)

Routing uses OpenRouteService. The API key is read from config `OpenRouteService:ApiKey`
(empty by default). To set it at runtime:

```bash
az webapp config appsettings set --name beaconmap --resource-group beaconmap-rg \
  --settings OpenRouteService__ApiKey="<your-key>"
```

The SQLite file (`beaconmap.db`) lives in `/home/site/wwwroot`, which persists across restarts.
EF Core migrations are applied automatically at startup (`Database.Migrate()` in `Program.cs`).

## Pipeline

`.github/workflows/deploy.yml` runs on push to `main` (and manual dispatch):

1. **build-and-test** — `npm ci` + frontend unit tests + `npm run build` (emits into `wwwroot`),
   then `dotnet restore/build`, install SpatiaLite, `dotnet test`, `dotnet publish`, upload artifact.
   Playwright e2e is intentionally excluded (needs a running app).
2. **deploy** (`environment: production`) — download artifact, `azure/login`, `azure/webapps-deploy`.
