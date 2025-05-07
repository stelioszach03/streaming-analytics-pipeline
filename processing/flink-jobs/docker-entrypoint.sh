#!/bin/bash

# Install netcat
apt-get update && apt-get install -y netcat-openbsd

# Wait for Kafka and Elasticsearch to be available
echo "Waiting for Kafka..."
until nc -z $KAFKA_BOOTSTRAP_SERVERS 9093; do
  echo "Kafka not available yet - sleeping"
  sleep 2
done

echo "Waiting for Elasticsearch..."
until nc -z $ELASTICSEARCH_HOST 9200; do
  echo "Elasticsearch not available yet - sleeping"
  sleep 2
done

echo "Submitting Flink job..."
flink run -d /opt/flink/usrlib/flink-metrics-processor.jar

# Keep the container running
tail -f /dev/null

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