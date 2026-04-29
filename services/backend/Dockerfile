# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /backend

# Önce sadece pom.xml kopyala → dependency cache katmanı
COPY pom.xml .
RUN mvn dependency:go-offline -B -q || true

# Kaynak kodu kopyala ve paketle (testleri atla)
COPY src ./src
RUN mvn package -DskipTests -B -q

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Güvenlik: root olmayan kullanıcı
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
