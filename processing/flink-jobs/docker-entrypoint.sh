#!/bin/bash

# Set up counter for retry attempts
RETRY_COUNT=0
MAX_RETRIES=30

echo "Waiting for Kafka..."
until nc -z -v $KAFKA_BOOTSTRAP_SERVERS 9093 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Kafka not available yet - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

# If max retries reached, exit with error
if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "Could not connect to Kafka after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

# Reset counter
RETRY_COUNT=0

echo "Waiting for Elasticsearch..."
until curl -s -f "http://$ELASTICSEARCH_HOST:$ELASTICSEARCH_PORT/_cluster/health" > /dev/null || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Elasticsearch not available yet - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "Could not connect to Elasticsearch after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

# Wait for Flink JobManager
RETRY_COUNT=0
echo "Waiting for Flink JobManager at $FLINK_JOBMANAGER_HOST:$FLINK_JOBMANAGER_PORT..."
until nc -z $FLINK_JOBMANAGER_HOST $FLINK_JOBMANAGER_PORT || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Flink JobManager not available yet - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "Could not connect to Flink JobManager after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

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
}' || echo "Error creating Elasticsearch index or index already exists"

echo "Submitting Flink job..."
# Explicitly specify the JobManager address to connect to
flink run -m $FLINK_JOBMANAGER_HOST:$FLINK_JOBMANAGER_PORT -d /opt/flink/usrlib/flink-metrics-processor.jar

# Keep the container running and log any errors
tail -f /dev/null