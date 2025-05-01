-- Create keyspace with NetworkTopologyStrategy for production environments
CREATE KEYSPACE IF NOT EXISTS metrics_analytics
  WITH REPLICATION = { 
    'class' : 'NetworkTopologyStrategy', 
    'datacenter1' : 3 
  }
  AND DURABLE_WRITES = true;

-- Use the keyspace
USE metrics_analytics;

-- Raw metrics table to store all incoming metrics
CREATE TABLE IF NOT EXISTS raw_metrics (
  service TEXT,
  metric TEXT,
  timestamp TIMESTAMP,
  value DOUBLE,
  host TEXT,
  region TEXT,
  id TEXT,
  PRIMARY KEY ((service, metric), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_unit': 'DAYS', 'compaction_window_size': 1}
  AND default_time_to_live = 2592000; -- 30 days TTL

-- Aggregated metrics table (minute-level)
CREATE TABLE IF NOT EXISTS aggregated_metrics_1min (
  service TEXT,
  metric TEXT,
  window_start TIMESTAMP,
  min_value DOUBLE,
  max_value DOUBLE,
  avg_value DOUBLE,
  count BIGINT,
  PRIMARY KEY ((service, metric), window_start)
) WITH CLUSTERING ORDER BY (window_start DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_unit': 'DAYS', 'compaction_window_size': 7}
  AND default_time_to_live = 7776000; -- 90 days TTL

-- Aggregated metrics table (hourly)
CREATE TABLE IF NOT EXISTS aggregated_metrics_1hour (
  service TEXT,
  metric TEXT,
  window_start TIMESTAMP,
  min_value DOUBLE,
  max_value DOUBLE,
  avg_value DOUBLE,
  count BIGINT,
  PRIMARY KEY ((service, metric), window_start)
) WITH CLUSTERING ORDER BY (window_start DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_unit': 'DAYS', 'compaction_window_size': 30}
  AND default_time_to_live = 31536000; -- 365 days TTL

-- Anomaly events
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID,
  service TEXT,
  metric TEXT,
  timestamp TIMESTAMP,
  value DOUBLE,
  expected_value DOUBLE,
  deviation DOUBLE,
  severity TEXT,
  PRIMARY KEY ((service, metric), timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 7776000; -- 90 days TTL

-- Service health status
CREATE TABLE IF NOT EXISTS service_health (
  service TEXT,
  timestamp TIMESTAMP,
  status TEXT,
  metrics_count INT,
  anomalies_count INT,
  avg_response_time DOUBLE,
  avg_cpu_usage DOUBLE,
  avg_memory_usage DOUBLE,
  PRIMARY KEY (service, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 2592000; -- 30 days TTL

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS raw_metrics_host_idx ON raw_metrics (host);
CREATE INDEX IF NOT EXISTS raw_metrics_region_idx ON raw_metrics (region);
CREATE INDEX IF NOT EXISTS anomalies_severity_idx ON anomalies (severity);

-- Create materialized views for specific query patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS raw_metrics_by_host AS
  SELECT service, metric, timestamp, value, host, region, id
  FROM raw_metrics
  WHERE host IS NOT NULL AND service IS NOT NULL AND metric IS NOT NULL AND timestamp IS NOT NULL
  PRIMARY KEY ((host), service, metric, timestamp)
  WITH CLUSTERING ORDER BY (service ASC, metric ASC, timestamp DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS raw_metrics_by_region AS
  SELECT service, metric, timestamp, value, host, region, id
  FROM raw_metrics
  WHERE region IS NOT NULL AND service IS NOT NULL AND metric IS NOT NULL AND timestamp IS NOT NULL
  PRIMARY KEY ((region), service, metric, timestamp)
  WITH CLUSTERING ORDER BY (service ASC, metric ASC, timestamp DESC);
