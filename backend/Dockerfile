# Serveur MadeHospital (Spring Boot) : construction Gradle puis image d'exécution JRE légère.
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace
# Dépendances d'abord, pour profiter du cache Docker tant que build.gradle ne change pas
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null
COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test && cp build/libs/*-SNAPSHOT.jar app.jar

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd --system --uid 1001 madehospital \
    && mkdir -p /app/medical-images /app/audit-cles \
    && chown -R madehospital /app
COPY --from=build /workspace/app.jar /app/app.jar
USER madehospital
ENV STORAGE_BASE_PATH=/app/medical-images \
    AUDIT_CLES_DIR=/app/audit-cles
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
