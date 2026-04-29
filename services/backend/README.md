# Backend Service (.NET)

Backend has been migrated from Java/Spring Boot to ASP.NET Core.

## Structure

```text
services/backend/
|- Apptivity.Backend.sln
|- src/
|  |- Apptivity.Api/
|  |- Apptivity.Application/
|  |- Apptivity.Domain/
|  `- Apptivity.Infrastructure/
`- tests/
   `- Apptivity.Api.Tests/
```

## Run

```bash
dotnet run --project services/backend/src/Apptivity.Api/Apptivity.Api.csproj
```

## Validate

```bash
dotnet restore services/backend/Apptivity.Backend.sln
dotnet build services/backend/Apptivity.Backend.sln --configuration Release
dotnet test services/backend/Apptivity.Backend.sln --configuration Release
```

