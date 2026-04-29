# Apptivity Monorepo

This repository follows a services + apps architecture.

## Layout

```text
.
|- apps/
|  |- web/                React + Vite
|  `- mobile/             Expo + React Native
|- services/
|  `- backend/            ASP.NET Core Web API (.NET 10)
`- .github/workflows/     CI pipelines
```

## Command Matrix

### Backend

```bash
dotnet restore services/backend/Apptivity.Backend.sln
dotnet build services/backend/Apptivity.Backend.sln --configuration Release
dotnet test services/backend/Apptivity.Backend.sln --configuration Release

dotnet run --project services/backend/src/Apptivity.Api/Apptivity.Api.csproj
```

### Web

```bash
cd apps/web
npm ci
npm run lint
npm run build
npm run dev
```

### Mobile

```bash
cd apps/mobile
npm ci
npm run lint
npx tsc --noEmit
npm run start
```

