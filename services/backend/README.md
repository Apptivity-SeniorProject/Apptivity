# Apptivity Backend

Spring Boot backend service for the Apptivity platform.

## Location

- Service root: `services/backend`
- Source: `services/backend/src/main/java`
- Resources: `services/backend/src/main/resources`

## Stack

- Java 17
- Spring Boot 3.4.3
- Spring Data JPA
- PostgreSQL
- Spring Security + JWT
- SpringDoc OpenAPI

## Run

```bash
mvn -f services/backend/pom.xml spring-boot:run
```

## Test and Build

```bash
mvn -f services/backend/pom.xml test
mvn -f services/backend/pom.xml package -DskipTests
```

## API Docs

When running locally:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/api-docs`

## Additional Docs

- `services/backend/docs/ARCHITECTURE.md`
- `services/backend/docs/HELP.md`
