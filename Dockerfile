# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# maven image = JDK 17 + Maven 3.9 bir arada
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Önce sadece pom.xml kopyala → dependency cache katmanı
COPY pom.xml .
RUN mvn dependency:go-offline -B -q || true

# Kaynak kodu kopyala ve paketle (test'leri atla)
COPY src ./src
RUN mvn package -DskipTests -B -q

# ─── Stage 2: Run ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Güvenlik: root olmayan kullanıcı
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
