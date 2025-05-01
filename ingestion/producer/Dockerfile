FROM maven:3.8.6-openjdk-11-slim AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src/ ./src/
RUN mvn package -DskipTests

FROM openjdk:11-jre-slim
WORKDIR /app
COPY --from=build /app/target/kafka-producer-1.0-SNAPSHOT.jar /app/kafka-producer.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/kafka-producer.jar"]
