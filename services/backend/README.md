# Apptivity Backend (.NET 10)

Shared API backend for both Web (Admin/Organization) and Mobile (Individual).

## Architecture

```text
services/backend/
|- Apptivity.Backend.sln
|- src/
|  |- Apptivity.Api/              HTTP layer, auth, controllers, middleware
|  |- Apptivity.Application/      Use-cases, contracts, result pattern, business rules
|  |- Apptivity.Domain/           Entities, enums, core models
|  `- Apptivity.Infrastructure/   EF Core, PostgreSQL, Redis, JWT, repositories
`- tests/
   `- Apptivity.Api.Tests/
```

## API Standards Implemented

- Version prefix: `/api/v1`
- Contract: REST + JSON
- Response envelope: `isSuccess`, `data`, `errors[]`, `timestamp` (UTC)
- Pagination: `pageNumber`, `pageSize` (default 20, max 100)
- Roles (JWT claims): `Admin`, `Organization`, `Individual`

## Current Endpoints (v1 scaffold)

- `POST /api/v1/auth/web/login`
- `POST /api/v1/auth/mobile/verify-otp`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/events`
- `POST /api/v1/events`
- `PATCH /api/v1/events/{eventId}/status`
- `POST /api/v1/events/{eventId}/submissions`
- `PATCH /api/v1/submissions/{submissionId}/status`
- `POST /api/v1/submissions/{submissionId}/withdraw`
- `GET /api/v1/profile/me`
- `GET /api/v1/health`

## Run

```bash
dotnet restore services/backend/Apptivity.Backend.sln
dotnet build services/backend/Apptivity.Backend.sln --configuration Release
dotnet test services/backend/Apptivity.Backend.sln --configuration Release

dotnet run --project services/backend/src/Apptivity.Api/Apptivity.Api.csproj
```

## Important Notes

- `FirebaseOtpVerifier` is a placeholder implementation. Real Firebase token verification is not wired yet.
- PostgreSQL schema migrations are not generated yet.
- Cloudinary and FCM configs are added to appsettings, but service integration is not implemented yet.
