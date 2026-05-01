# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Apptivity.Backend.sln", "./"]
COPY ["src/Apptivity.Api/Apptivity.Api.csproj", "src/Apptivity.Api/"]
COPY ["src/Apptivity.Application/Apptivity.Application.csproj", "src/Apptivity.Application/"]
COPY ["src/Apptivity.Domain/Apptivity.Domain.csproj", "src/Apptivity.Domain/"]
COPY ["src/Apptivity.Infrastructure/Apptivity.Infrastructure.csproj", "src/Apptivity.Infrastructure/"]
COPY ["tests/Apptivity.Api.Tests/Apptivity.Api.Tests.csproj", "tests/Apptivity.Api.Tests/"]

RUN dotnet restore "Apptivity.Backend.sln"

COPY . .
RUN dotnet publish "src/Apptivity.Api/Apptivity.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Apptivity.Api.dll"]
