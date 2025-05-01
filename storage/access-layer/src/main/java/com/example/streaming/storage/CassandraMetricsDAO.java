package com.example.streaming.storage;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.CqlSessionBuilder;
import com.datastax.oss.driver.api.core.cql.*;
import com.datastax.oss.driver.api.core.type.DataTypes;
import com.datastax.oss.driver.api.querybuilder.QueryBuilder;
import com.datastax.oss.driver.api.querybuilder.SchemaBuilder;
import com.datastax.oss.driver.api.querybuilder.select.Select;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetSocketAddress;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;

public class CassandraMetricsDAO {
    private static final Logger logger = LoggerFactory.getLogger(CassandraMetricsDAO.class);
    
    private final CqlSession session;
    private final String keyspace;
    
    // Prepared statements for better performance
    private PreparedStatement insertRawMetricStmt;
    private PreparedStatement insertAggregatedMetric1minStmt;
    private PreparedStatement insertAnomalyStmt;
    private PreparedStatement insertServiceHealthStmt;
    private PreparedStatement getRawMetricsStmt;
    private PreparedStatement getAggregatedMetricsStmt;
    private PreparedStatement getAnomaliesStmt;
    private PreparedStatement getServiceHealthStmt;
    
    public CassandraMetricsDAO(String contactPoint, int port, String datacenter, String keyspace) {
        this.keyspace = keyspace;
        
        // Build Cassandra session
        session = CqlSession.builder()
                .addContactPoint(new InetSocketAddress(contactPoint, port))
                .withLocalDatacenter(datacenter)
                .withKeyspace(keyspace)
                .build();
        
        // Initialize prepared statements
        prepareStatements();
        
        logger.info("Cassandra DAO initialized with keyspace: {}", keyspace);
    }
    
    /**
     * Initialize prepared statements for better performance
     */
    private void prepareStatements() {
        // Insert statements
        insertRawMetricStmt = session.prepare(
                "INSERT INTO raw_metrics (service, metric, timestamp, value, host, region, id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        insertAggregatedMetric1minStmt = session.prepare(
                "INSERT INTO aggregated_metrics_1min (service, metric, window_start, min_value, max_value, avg_value, count) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        insertAnomalyStmt = session.prepare(
                "INSERT INTO anomalies (id, service, metric, timestamp, value, expected_value, deviation, severity) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        insertServiceHealthStmt = session.prepare(
                "INSERT INTO service_health (service, timestamp, status, metrics_count, anomalies_count, " +
                "avg_response_time, avg_cpu_usage, avg_memory_usage) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        // Select statements
        getRawMetricsStmt = session.prepare(
                "SELECT * FROM raw_metrics WHERE service = ? AND metric = ? AND timestamp >= ? AND timestamp <= ? " +
                "ORDER BY timestamp DESC LIMIT ?");
        
        getAggregatedMetricsStmt = session.prepare(
                "SELECT * FROM aggregated_metrics_1min WHERE service = ? AND metric = ? AND window_start >= ? AND window_start <= ? " +
                "ORDER BY window_start DESC");
        
        getAnomaliesStmt = session.prepare(
                "SELECT * FROM anomalies WHERE service = ? AND metric = ? AND timestamp >= ? AND timestamp <= ? " +
                "ORDER BY timestamp DESC");
        
        getServiceHealthStmt = session.prepare(
                "SELECT * FROM service_health WHERE service = ? AND timestamp >= ? AND timestamp <= ? " +
                "ORDER BY timestamp DESC");
    }
    
    /**
     * Insert a raw metric data point
     */
    public void insertRawMetric(String service, String metric, Instant timestamp, double value, 
                               String host, String region, String id) {
        BoundStatement bound = insertRawMetricStmt.bind(
                service, metric, timestamp, value, host, region, id);
        
        session.executeAsync(bound)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        logger.error("Error inserting raw metric: {}", error.getMessage());
                    }
                });
    }
    
    /**
     * Insert an aggregated metric
     */
    public void insertAggregatedMetric(String service, String metric, Instant windowStart,
                                      double minValue, double maxValue, double avgValue, long count) {
        BoundStatement bound = insertAggregatedMetric1minStmt.bind(
                service, metric, windowStart, minValue, maxValue, avgValue, count);
        
        session.executeAsync(bound)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        logger.error("Error inserting aggregated metric: {}", error.getMessage());
                    }
                });
    }
    
    /**
     * Insert an anomaly event
     */
    public void insertAnomaly(UUID id, String service, String metric, Instant timestamp,
                             double value, double expectedValue, double deviation, String severity) {
        BoundStatement bound = insertAnomalyStmt.bind(
                id, service, metric, timestamp, value, expectedValue, deviation, severity);
        
        session.executeAsync(bound)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        logger.error("Error inserting anomaly: {}", error.getMessage());
                    }
                });
    }
    
    /**
     * Insert service health status
     */
    public void insertServiceHealth(String service, Instant timestamp, String status,
                                   int metricsCount, int anomaliesCount, double avgResponseTime,
                                   double avgCpuUsage, double avgMemoryUsage) {
        BoundStatement bound = insertServiceHealthStmt.bind(
                service, timestamp, status, metricsCount, anomaliesCount,
                avgResponseTime, avgCpuUsage, avgMemoryUsage);
        
        session.executeAsync(bound)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        logger.error("Error inserting service health: {}", error.getMessage());
                    }
                });
    }
    
    /**
     * Get raw metrics for a service and metric within a time range
     */
    public List<Map<String, Object>> getRawMetrics(String service, String metric, 
                                                  Instant startTime, Instant endTime, int limit) {
        BoundStatement bound = getRawMetricsStmt.bind(service, metric, startTime, endTime, limit);
        ResultSet rs = session.execute(bound);
        
        List<Map<String, Object>> results = new ArrayList<>();
        for (Row row : rs) {
            Map<String, Object> metric_data = new HashMap<>();
            metric_data.put("service", row.getString("service"));
            metric_data.put("metric", row.getString("metric"));
            metric_data.put("timestamp", row.getInstant("timestamp"));
            metric_data.put("value", row.getDouble("value"));
            metric_data.put("host", row.getString("host"));
            metric_data.put("region", row.getString("region"));
            metric_data.put("id", row.getString("id"));
            results.add(metric_data);
        }
        
        return results;
    }
    
    /**
     * Get aggregated metrics for a service and metric within a time range
     */
    public List<Map<String, Object>> getAggregatedMetrics(String service, String metric,
                                                         Instant startTime, Instant endTime) {
        BoundStatement bound = getAggregatedMetricsStmt.bind(service, metric, startTime, endTime);
        ResultSet rs = session.execute(bound);
        
        List<Map<String, Object>> results = new ArrayList<>();
        for (Row row : rs) {
            Map<String, Object> metric_data = new HashMap<>();
            metric_data.put("service", row.getString("service"));
            metric_data.put("metric", row.getString("metric"));
            metric_data.put("window_start", row.getInstant("window_start"));
            metric_data.put("min_value", row.getDouble("min_value"));
            metric_data.put("max_value", row.getDouble("max_value"));
            metric_data.put("avg_value", row.getDouble("avg_value"));
            metric_data.put("count", row.getLong("count"));
            results.add(metric_data);
        }
        
        return results;
    }
    
    /**
     * Get anomalies for a service and metric within a time range
     */
    public List<Map<String, Object>> getAnomalies(String service, String metric,
                                                 Instant startTime, Instant endTime) {
        BoundStatement bound = getAnomaliesStmt.bind(service, metric, startTime, endTime);
        ResultSet rs = session.execute(bound);
        
        List<Map<String, Object>> results = new ArrayList<>();
        for (Row row : rs) {
            Map<String, Object> anomaly = new HashMap<>();
            anomaly.put("id", row.getUuid("id"));
            anomaly.put("service", row.getString("service"));
            anomaly.put("metric", row.getString("metric"));
            anomaly.put("timestamp", row.getInstant("timestamp"));
            anomaly.put("value", row.getDouble("value"));
            anomaly.put("expected_value", row.getDouble("expected_value"));
            anomaly.put("deviation", row.getDouble("deviation"));
            anomaly.put("severity", row.getString("severity"));
            results.add(anomaly);
        }
        
        return results;
    }
    
    /**
     * Get service health status for a service within a time range
     */
    public List<Map<String, Object>> getServiceHealth(String service, 
                                                     Instant startTime, Instant endTime) {
        BoundStatement bound = getServiceHealthStmt.bind(service, startTime, endTime);
        ResultSet rs = session.execute(bound);
        
        List<Map<String, Object>> results = new ArrayList<>();
        for (Row row : rs) {
            Map<String, Object> health = new HashMap<>();
            health.put("service", row.getString("service"));
            health.put("timestamp", row.getInstant("timestamp"));
            health.put("status", row.getString("status"));
            health.put("metrics_count", row.getInt("metrics_count"));
            health.put("anomalies_count", row.getInt("anomalies_count"));
            health.put("avg_response_time", row.getDouble("avg_response_time"));
            health.put("avg_cpu_usage", row.getDouble("avg_cpu_usage"));
            health.put("avg_memory_usage", row.getDouble("avg_memory_usage"));
            results.add(health);
        }
        
        return results;
    }
    
    /**
     * Get latest metrics for all services
     */
    public Map<String, Map<String, Double>> getLatestMetrics() {
        // Use a custom query for this operation
        String query = "SELECT service, metric, value FROM raw_metrics " +
                       "WHERE timestamp > ? PER PARTITION LIMIT 1";
        
        // Get metrics from the last hour
        PreparedStatement stmt = session.prepare(query);
        BoundStatement bound = stmt.bind(Instant.now().minus(1, ChronoUnit.HOURS));
        ResultSet rs = session.execute(bound);
        
        Map<String, Map<String, Double>> results = new HashMap<>();
        
        for (Row row : rs) {
            String service = row.getString("service");
            String metric = row.getString("metric");
            double value = row.getDouble("value");
            
            results.computeIfAbsent(service, k -> new HashMap<>())
                   .put(metric, value);
        }
        
        return results;
    }
    
    /**
     * Close the Cassandra session
     */
    public void close() {
        if (session != null) {
            session.close();
            logger.info("Cassandra session closed");
        }
    }
    
    /**
     * Create a REST API method to fetch data for the dashboard
     */
    public Map<String, Object> getDashboardData() {
        Map<String, Object> dashboardData = new HashMap<>();
        
        // Get latest metrics
        dashboardData.put("latestMetrics", getLatestMetrics());
        
        // Get recent anomalies (last 24 hours)
        Instant now = Instant.now();
        Instant oneDayAgo = now.minus(24, ChronoUnit.HOURS);
        
        // Use a custom query to get all anomalies across services
        String anomalyQuery = "SELECT * FROM anomalies WHERE timestamp > ? ALLOW FILTERING";
        PreparedStatement anomalyStmt = session.prepare(anomalyQuery);
        BoundStatement anomalyBound = anomalyStmt.bind(oneDayAgo);
        ResultSet anomalyRs = session.execute(anomalyBound);
        
        List<Map<String, Object>> recentAnomalies = new ArrayList<>();
        for (Row row : anomalyRs) {
            Map<String, Object> anomaly = new HashMap<>();
            anomaly.put("id", row.getUuid("id").toString());
            anomaly.put("service", row.getString("service"));
            anomaly.put("metric", row.getString("metric"));
            anomaly.put("timestamp", row.getInstant("timestamp").toEpochMilli());
            anomaly.put("value", row.getDouble("value"));
            anomaly.put("expected_value", row.getDouble("expected_value"));
            anomaly.put("deviation", row.getDouble("deviation"));
            anomaly.put("severity", row.getString("severity"));
            recentAnomalies.add(anomaly);
        }
        dashboardData.put("recentAnomalies", recentAnomalies);
        
        // Get service health
        String healthQuery = "SELECT * FROM service_health WHERE timestamp > ? ALLOW FILTERING";
        PreparedStatement healthStmt = session.prepare(healthQuery);
        BoundStatement healthBound = healthStmt.bind(oneDayAgo);
        ResultSet healthRs = session.execute(healthBound);
        
        Map<String, Object> serviceHealth = new HashMap<>();
        for (Row row : healthRs) {
            String service = row.getString("service");
            if (!serviceHealth.containsKey(service)) {
                Map<String, Object> health = new HashMap<>();
                health.put("service", service);
                health.put("timestamp", row.getInstant("timestamp").toEpochMilli());
                health.put("status", row.getString("status"));
                health.put("metrics_count", row.getInt("metrics_count"));
                health.put("anomalies_count", row.getInt("anomalies_count"));
                health.put("avg_response_time", row.getDouble("avg_response_time"));
                health.put("avg_cpu_usage", row.getDouble("avg_cpu_usage"));
                health.put("avg_memory_usage", row.getDouble("avg_memory_usage"));
                serviceHealth.put(service, health);
            }
        }
        dashboardData.put("serviceHealth", serviceHealth);
        
        return dashboardData;
    }
}
