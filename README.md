# Apptivity Monorepo

This repository is organized as a `services + apps` monorepo.

## Repository Layout

```text
.
|- apps/
|  |- web/       (React + Vite)
|  `- mobile/    (Expo + React Native)
|- services/
|  `- backend/   (Spring Boot + Maven)
`- .github/workflows/
```

## Command Matrix

### Backend (`services/backend`)

```bash
mvn -f services/backend/pom.xml test
mvn -f services/backend/pom.xml package -DskipTests
mvn -f services/backend/pom.xml spring-boot:run
```

### Web (`apps/web`)

```bash
cd apps/web
npm ci
npm run lint
npm run build
npm run dev
```

### Mobile (`apps/mobile`)

```bash
cd apps/mobile
npm ci
npm run lint
npx tsc --noEmit
npm run start
```

## CI Workflows

- Backend CI: `.github/workflows/backend.yml`
- Web CI: `.github/workflows/web.yml`
- Mobile CI: `.github/workflows/mobile.yml`

Backend workflow now targets `services/backend/**` paths.
