FROM maven:3.8.6-openjdk-11-slim AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src/ ./src/
RUN mvn package -DskipTests

FROM flink:1.17.0-scala_2.12-java11
WORKDIR /opt/flink/usrlib
COPY --from=build /app/target/flink-metrics-processor-1.0-SNAPSHOT.jar /opt/flink/usrlib/flink-metrics-processor.jar

# Copy the necessary dependencies (not provided by Flink)
COPY --from=build /root/.m2/repository/org/apache/flink/flink-connector-kafka/1.17.0/flink-connector-kafka-1.17.0.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/apache/flink/flink-connector-elasticsearch-7/1.17.0/flink-connector-elasticsearch-7-1.17.0.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/apache/kafka/kafka-clients/3.4.0/kafka-clients-3.4.0.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/json/json/20230227/json-20230227.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/elasticsearch/elasticsearch-rest-high-level-client/7.17.10/elasticsearch-rest-high-level-client-7.17.10.jar /opt/flink/lib/

# Use a custom entrypoint to submit the job
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]