# Deployment Pipeline and Hosting Pattern

This document explains how the app this approach was created for is built, packaged, and hosted, with the goal of making the same approach easy to reuse in another application.

It describes both:

- the concrete setup used in this repository
- the reusable deployment pattern an AI coding agent can apply elsewhere

## Summary

The app this approach was created for uses a split frontend/backend codebase, but deploys as a single Azure App Service application.

The key pattern is:

1. Build the frontend first.
2. Emit the frontend build directly into the backend's static web root.
3. Build, test, and publish the backend.
4. Deploy the published backend artifact to Azure App Service.
5. Let the backend serve both API routes and the built SPA assets.

This avoids running the frontend as a separate deployed service.

## Current Reference Architecture

The app this approach was created for uses:

- Vue 3 + Vite for the frontend
- .NET 8 Web API for the backend
- Azure App Service for hosting
- GitHub Actions for CI/CD

In production, the .NET app is the only deployed runtime. The Vue app is compiled to static assets and served by ASP.NET Core.

## Hosting Model

### Frontend hosting

The frontend build output is written directly into the backend web root:

- [headmap-ui/vite.config.js](/Users/andrew.seward/dev/Headmap/headmap-ui/vite.config.js)

Relevant setting:

```js
build: {
  outDir: '../Headmap.Api/wwwroot',
  emptyOutDir: true,
}
```

That means `npm run build` replaces the contents of `Headmap.Api/wwwroot` with the latest SPA assets.

### Backend hosting

The backend serves:

- static files from `wwwroot`
- API routes via controllers
- SPA fallback routing to `index.html`

This is configured in:

- [Headmap.Api/Program.cs](/Users/andrew.seward/dev/Headmap/Headmap.Api/Program.cs)

Key hosting behavior:

```csharp
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var indexPath = Path.Combine(app.Environment.WebRootPath ?? string.Empty, "index.html");
if (File.Exists(indexPath))
{
    app.MapFallbackToFile("index.html").AllowAnonymous();
}
```

This gives one deployable web app that handles both SPA navigation and API requests.

## CI/CD Workflow

The deployment workflow lives at:

- [.github/workflows/deploy.yml](/Users/andrew.seward/dev/Headmap/.github/workflows/deploy.yml)

It has two jobs:

1. `build-and-test`
2. `deploy`

### Job 1: build-and-test

This job runs on every push to `main` and on manual dispatch.

It performs the following steps:

1. Check out the repository.
2. Install the required .NET SDK.
3. Install the required Node.js version.
4. Install frontend dependencies with `npm ci`.
5. Build the frontend with production environment variables.
6. Restore backend dependencies with `dotnet restore`.
7. Build the .NET solution in Release mode.
8. Run backend tests.
9. Publish the backend application to a `publish` folder.
10. Upload the published output as a workflow artifact.

Important detail: the frontend build happens before `dotnet publish`, so the generated SPA assets are already inside `Headmap.Api/wwwroot` when the backend is published.

### Job 2: deploy

This job depends on the first job succeeding.

It performs the following steps:

1. Download the published artifact.
2. Authenticate to Azure using a service principal stored in GitHub Secrets.
3. Deploy the published folder to Azure App Service using `azure/webapps-deploy`.

## Why this pattern works

This pattern is effective when:

- the frontend is a static SPA
- the backend already owns the domain and authentication flow
- you want one deployment unit instead of separate frontend and backend infrastructure
- the backend should serve the SPA directly

The main advantage is operational simplicity:

- one app service
- one deploy artifact
- one production hostname
- one place to configure auth and environment settings

## Secrets and environment configuration

### GitHub Actions secrets

The reference app's workflow expects these GitHub Secrets:

- `AZURE_CREDENTIALS`
- `VITE_ENTRA_CLIENT_ID`
- `VITE_ENTRA_TENANT_ID`
- `VITE_ENTRA_API_CLIENT_ID`
- `VITE_ENTRA_REDIRECT_URI`

These are used during the frontend build and Azure deployment.

### Azure App Service settings

The reference app expects these App Service settings:

- `AzureAd__TenantId`
- `AzureAd__ClientId`
- `AzureAd__ClientSecret`
- `AzureAd__Audience`

The frontend values are compiled at build time. The backend values are supplied at runtime by App Service configuration.

## Reusable Pattern for Another App

An AI coding agent can apply this same pattern to another SPA + API app by following these decisions.

### 1. Choose the backend as the deployment host

Use the backend as the only deployed runtime when:

- the frontend can be prebuilt to static files
- the backend should own routing, auth, and hosting

Avoid a separate frontend hosting platform unless there is a strong reason, such as CDN-only hosting requirements or a separately scaled frontend team.

### 2. Build the SPA into the backend static assets directory

Configure the frontend build tool to output into the backend's static files folder.

Examples:

- ASP.NET Core: `wwwroot`
- Node/Express static hosting: `public` or equivalent

The important principle is that the frontend build artifacts must be present before backend publish/package steps run.

### 3. Publish only the backend artifact

Do not deploy frontend and backend separately if you want to reuse this pattern.

Instead:

- build the frontend
- copy or emit the assets into the backend static folder
- publish the backend
- deploy the published backend output only

### 4. Add SPA fallback routing in the backend host

For client-side routes to work in production, the backend host must return `index.html` for unknown non-API routes.

In ASP.NET Core, the pattern is:

```csharp
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");
```

Only enable the fallback when the built `index.html` actually exists.

### 5. Split build-time frontend config from runtime backend config

Use this distinction consistently:

- frontend public settings: injected at build time
- backend secrets and confidential settings: injected at runtime

Do not put backend secrets into frontend env files.

## Recommended pipeline template

For another app, an AI coding agent should usually implement the pipeline in this order:

1. Check out the repo.
2. Install frontend and backend toolchains.
3. Install frontend dependencies.
4. Build the frontend with production env values.
5. Restore backend dependencies.
6. Build backend.
7. Run tests.
8. Publish backend.
9. Upload artifact.
10. Deploy artifact to the host platform.

If the app uses GitHub Actions, this repository's workflow is a good template.

## Adaptation checklist for another app

When applying this approach elsewhere, verify all of the following:

- The frontend build output path points into the backend static directory.
- The backend serves static assets in production.
- The backend provides SPA fallback routing.
- The CI workflow builds the frontend before publishing the backend.
- The deploy step ships only the published backend artifact.
- Public frontend config values are available at build time.
- Backend secrets are available at runtime in the hosting platform.
- The backend host can serve both API traffic and SPA navigation under one domain.

## Trade-offs

### Benefits

- Simpler deployment model
- One artifact to deploy
- One hostname for SPA and API
- Easier auth integration
- No separate frontend hosting layer required

### Costs

- Frontend and backend releases are coupled
- The frontend must be rebuilt for configuration changes that are compile-time only
- Static assets are tied to backend publish timing
- Large frontend bundles still affect backend deploy payload size

## Headmap-specific notes

- The frontend dev server proxies `/api` requests to the backend locally using the backend launch settings.
- Production frontend assets are written directly to `Headmap.Api/wwwroot`.
- The Azure deployment target is a single App Service named via `AZURE_WEBAPP_NAME` in the workflow.
- The backend only maps the SPA fallback if `wwwroot/index.html` exists, which prevents test-host issues before the frontend is built.

## What an AI coding agent should copy vs adapt

### Copy directly

- The job ordering: frontend build before backend publish
- The single-artifact deployment model
- The static-file + SPA-fallback hosting pattern
- The split between GitHub Secrets and App Service runtime settings

### Adapt per app

- The frontend build command
- The backend publish command
- The static output directory
- The hosting provider
- The runtime environment variables and secrets
- The authentication configuration

## Minimal decision rule

If another app has:

- a static SPA frontend
- a backend API
- one desired production hostname
- no strong reason to host the frontend separately

then this deployment model is a strong default:

- compile the SPA into backend static assets
- publish the backend
- deploy the backend artifact
- let the backend serve both the app shell and the API