#!/bin/bash

# Wait for Kafka and Elasticsearch to be available
echo "Waiting for Kafka..."
until nc -z $KAFKA_BOOTSTRAP_SERVERS_HOST 9092; do
  echo "Kafka not available yet - sleeping"
  sleep 2
done

echo "Waiting for Elasticsearch..."
until nc -z $ELASTICSEARCH_HOST 9200; do
  echo "Elasticsearch not available yet - sleeping"
  sleep 2
done

# Submit the Flink job
echo "Submitting Flink job..."
flink run -d /opt/flink/usrlib/flink-metrics-processor.jar

# Keep the container running
tail -f /dev/null
