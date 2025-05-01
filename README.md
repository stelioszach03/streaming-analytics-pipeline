# Streaming Analytics Pipeline

This project implements a complete production-grade real-time streaming analytics pipeline with data ingestion, processing, storage, monitoring, and visualization components.

## Components

- **Data Ingestion**: Apache Kafka for high-throughput, fault-tolerant messaging
- **Stream Processing**: Apache Flink for stateful stream processing with exactly-once semantics
- **Storage**: Apache Cassandra for scalable time-series data storage
- **Monitoring**: Prometheus, Alertmanager, and Grafana for metrics collection and visualization
- **Frontend**: React-based dashboard with real-time metrics visualization

## Setup and Deployment

See the [Deployment Guide](DEPLOYMENT.md) for detailed instructions on how to build, deploy, and run the streaming analytics pipeline.

## Architecture

The architecture follows a modern streaming analytics pattern:

1. **Data Sources** → **Kafka** → **Flink** → **Cassandra/Elasticsearch** → **API Gateway** → **React Dashboard**
2. **Monitoring**: Prometheus collects metrics from all components, Alertmanager handles alerts, and Grafana provides visualization

## Development

- **Ingestion Layer**: Java-based Kafka producers and consumers
- **Processing Layer**: Flink jobs with stateful operators for aggregation and anomaly detection
- **Storage Layer**: Cassandra schema optimized for time-series analytics
- **Frontend**: React components with real-time WebSocket communication

## License

MIT
