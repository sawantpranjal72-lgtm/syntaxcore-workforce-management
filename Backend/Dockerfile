# ─── Stage 1: Build ───────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# FIX: Create dirs and set permissions BEFORE switching to non-root user
RUN addgroup -S syntaxcore && adduser -S syntaxcore -G syntaxcore \
    && mkdir -p uploads logs \
    && chown -R syntaxcore:syntaxcore /app

USER syntaxcore

COPY --from=builder --chown=syntaxcore:syntaxcore /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
