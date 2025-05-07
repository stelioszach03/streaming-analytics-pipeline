#!/bin/bash

# Set up counter for retry attempts
RETRY_COUNT=0
MAX_RETRIES=20

echo "Waiting for Kafka..."
until nc -z $KAFKA_BOOTSTRAP_SERVERS 9093 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Kafka not available yet - sleeping"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

# Reset counter
RETRY_COUNT=0

echo "Waiting for Elasticsearch..."
until curl -s -f "http://$ELASTICSEARCH_HOST:$ELASTICSEARCH_PORT/_cluster/health" > /dev/null || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Elasticsearch not available yet - sleeping"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

# Wait for Flink JobManager
RETRY_COUNT=0
echo "Waiting for Flink JobManager at $FLINK_JOBMANAGER_HOST:$FLINK_JOBMANAGER_PORT..."
until nc -z $FLINK_JOBMANAGER_HOST $FLINK_JOBMANAGER_PORT || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Flink JobManager not available yet - sleeping"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

# Create Elasticsearch index if it doesn't exist
echo "Creating Elasticsearch index if it doesn't exist..."
curl -X PUT "http://$ELASTICSEARCH_HOST:$ELASTICSEARCH_PORT/metrics" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "service": { "type": "keyword" },
      "metric": { "type": "keyword" },
      "min": { "type": "float" },
      "max": { "type": "float" },
      "avg": { "type": "float" },
      "count": { "type": "long" },
      "window_start": { "type": "date" },
      "window_end": { "type": "date" }
    }
  }
}' || echo "Error creating Elasticsearch index"

echo "Submitting Flink job..."
# Explicitly specify the JobManager address to connect to
flink run -m $FLINK_JOBMANAGER_HOST:$FLINK_JOBMANAGER_PORT -d /opt/flink/usrlib/flink-metrics-processor.jar

# Keep the container running
tail -f /dev/null