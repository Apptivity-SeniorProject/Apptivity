# Backend Architecture

This document describes the current backend package structure.

## Runtime Stack

- Framework: Spring Boot 3.x
- Build tool: Maven
- Database: PostgreSQL
- Persistence: Spring Data JPA

## Package Layout

```text
com.example.apptivitybackend
|- constants/
|- controller/
|- exception/
|- model/
|- repository/
|- security/
`- services/
```

## Responsibilities

- `controller`: HTTP endpoints
- `services`: business logic
- `repository`: data access
- `model`: JPA entities
- `security`: auth/security configuration
- `exception`: global and domain exceptions
- `constants`: static constants

## Notes

Legacy references to Gradle and MongoDB were removed. The source of truth is Maven + PostgreSQL + JPA.
