# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first (for layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B

# ---- Run Stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl for Docker healthcheck support
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Create upload directory
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
