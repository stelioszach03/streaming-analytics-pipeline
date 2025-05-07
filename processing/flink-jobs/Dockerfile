FROM maven:3.8.6-openjdk-11-slim AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src/ ./src/
RUN mvn package -DskipTests

FROM flink:1.16.1-scala_2.12-java11
WORKDIR /opt/flink/usrlib

# Install necessary packages
RUN apt-get update && apt-get install -y netcat-openbsd curl

# Copy the packaged JAR file with all dependencies
COPY --from=build /app/target/flink-metrics-processor-1.0-SNAPSHOT.jar /opt/flink/usrlib/flink-metrics-processor.jar

# Copy script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]