# Backend Help

Quick commands for local backend development.

## Prerequisites

- JDK 17+
- Maven 3.9+
- PostgreSQL running locally or in Docker

## Commands

```bash
mvn -f services/backend/pom.xml compile
mvn -f services/backend/pom.xml test
mvn -f services/backend/pom.xml spring-boot:run
```

## Common URLs

- App: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/api-docs`
