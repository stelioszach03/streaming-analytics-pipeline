FROM maven:3.8.6-openjdk-11-slim AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src/ ./src/
RUN mvn package -DskipTests

# Use Flink 1.16.1 instead of 1.17.0
FROM flink:1.16.1-scala_2.12-java11
WORKDIR /opt/flink/usrlib
COPY --from=build /app/target/flink-metrics-processor-1.0-SNAPSHOT.jar /opt/flink/usrlib/flink-metrics-processor.jar

# Copy the necessary dependencies
COPY --from=build /root/.m2/repository/org/apache/flink/flink-connector-kafka/1.16.1/flink-connector-kafka-1.16.1.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/apache/kafka/kafka-clients/3.2.3/kafka-clients-3.2.3.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/json/json/20230227/json-20230227.jar /opt/flink/lib/

# Copy Elasticsearch connector and dependencies for Flink 1.16.1
COPY --from=build /root/.m2/repository/org/apache/flink/flink-connector-elasticsearch7/1.16.1/flink-connector-elasticsearch7-1.16.1.jar /opt/flink/lib/

# Copy Elasticsearch client libraries
COPY --from=build /root/.m2/repository/org/elasticsearch/client/elasticsearch-rest-high-level-client/7.17.10/elasticsearch-rest-high-level-client-7.17.10.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/elasticsearch/elasticsearch/7.17.10/elasticsearch-7.17.10.jar /opt/flink/lib/
COPY --from=build /root/.m2/repository/org/elasticsearch/client/elasticsearch-rest-client/7.17.10/elasticsearch-rest-client-7.17.10.jar /opt/flink/lib/

# Use a custom entrypoint to submit the job
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]