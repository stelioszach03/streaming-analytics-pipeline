package com.example.streaming.producer;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;

public class MetricsProducer {
    private static final Logger logger = LoggerFactory.getLogger(MetricsProducer.class);
    private static final String BOOTSTRAP_SERVERS = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
    private static final String TOPIC_NAME = System.getenv().getOrDefault("KAFKA_TOPIC", "metrics-data");
    private static final String SERVICE_NAME = System.getenv().getOrDefault("SERVICE_NAME", "system-monitor");
    private static final String REGION = System.getenv().getOrDefault("REGION", "default-region");
    
    private static final SystemInfo systemInfo = new SystemInfo();
    private static final HardwareAbstractionLayer hardware = systemInfo.getHardware();
    
    public static void main(String[] args) {
        Properties properties = new Properties();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.ACKS_CONFIG, "all");
        properties.put(ProducerConfig.RETRIES_CONFIG, 3);
        properties.put(ProducerConfig.LINGER_MS_CONFIG, 1);
        properties.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        logger.info("Starting Metrics Producer with kafka bootstrap servers: {}", BOOTSTRAP_SERVERS);
        logger.info("Service name: {}, Region: {}", SERVICE_NAME, REGION);
        
        try (KafkaProducer<String, String> producer = new KafkaProducer<>(properties)) {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            
            // Store previous CPU ticks for delta calculation
            long[] prevTicks = hardware.getProcessor().getSystemCpuLoadTicks();
            
            scheduler.scheduleAtFixedRate(() -> {
                try {
                    // Get CPU processor
                    CentralProcessor processor = hardware.getProcessor();
                    
                    // Get current CPU ticks
                    long[] ticks = processor.getSystemCpuLoadTicks();
                    
                    // Calculate CPU usage based on tick deltas
                    double cpuUsage = processor.getSystemCpuLoadBetweenTicks(prevTicks) * 100;
                    
                    // Update previous ticks for next calculation
                    System.arraycopy(ticks, 0, prevTicks, 0, ticks.length);
                    
                    // Get memory info
                    GlobalMemory memory = hardware.getMemory();
                    long totalMemory = memory.getTotal();
                    long availableMemory = memory.getAvailable();
                    double memoryUsage = ((double)(totalMemory - availableMemory) / totalMemory) * 100;
                    
                    // Send CPU metric
                    sendMetric(producer, "cpu_usage", cpuUsage);
                    
                    // Send memory metric
                    sendMetric(producer, "memory_usage", memoryUsage);
                    
                    // Send disk usage metric
                    double diskUsage = calculateDiskUsage();
                    sendMetric(producer, "disk_usage", diskUsage);
                    
                    // Send process count metric
                    int processCount = systemInfo.getOperatingSystem().getProcessCount();
                    sendMetric(producer, "process_count", processCount);
                    
                    // Send service health data
                    sendServiceHealth(producer, cpuUsage, memoryUsage);
                    
                    logger.info("Metrics sent - CPU: {:.2f}%, Memory: {:.2f}%, Disk: {:.2f}%, Processes: {}", 
                            cpuUsage, memoryUsage, diskUsage, processCount);
                    
                } catch (Exception e) {
                    logger.error("Error in scheduled metrics collection", e);
                }
            }, 0, 5, TimeUnit.SECONDS);
            
            // Keep the application running
            Thread.sleep(Long.MAX_VALUE);
            
        } catch (InterruptedException e) {
            logger.info("Producer interrupted, shutting down");
        } catch (Exception e) {
            logger.error("Unexpected error in metrics producer", e);
        }
    }
    
    private static void sendMetric(KafkaProducer<String, String> producer, String metricName, double value) {
        try {
            JSONObject data = new JSONObject();
            data.put("id", UUID.randomUUID().toString());
            data.put("timestamp", System.currentTimeMillis());
            data.put("service", SERVICE_NAME);
            data.put("metric", metricName);
            data.put("value", value);
            data.put("host", systemInfo.getOperatingSystem().getNetworkParams().getHostName());
            data.put("region", REGION);
            
            String key = SERVICE_NAME + "-" + metricName;
            ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, key, data.toString());
            
            producer.send(record, (metadata, exception) -> {
                if (exception == null) {
                    logger.debug("Metric sent: topic={}, partition={}, offset={}", 
                            metadata.topic(), metadata.partition(), metadata.offset());
                } else {
                    logger.error("Error sending metric {}", metricName, exception);
                }
            });
        } catch (Exception e) {
            logger.error("Error creating/sending metric {}", metricName, e);
        }
    }
    
    private static void sendServiceHealth(KafkaProducer<String, String> producer, double cpuUsage, double memoryUsage) {
        try {
            // Determine health status based on metrics
            String status = "healthy";
            if (cpuUsage > 80 || memoryUsage > 80) {
                status = "critical";
            } else if (cpuUsage > 60 || memoryUsage > 60) {
                status = "warning";
            }
            
            JSONObject healthData = new JSONObject();
            healthData.put("service", SERVICE_NAME);
            healthData.put("timestamp", System.currentTimeMillis());
            healthData.put("status", status);
            healthData.put("metrics_count", 4); // CPU, memory, disk, process count
            healthData.put("anomalies_count", 0);
            healthData.put("avg_response_time", 0);
            healthData.put("avg_cpu_usage", cpuUsage);
            healthData.put("avg_memory_usage", memoryUsage);
            
            String key = SERVICE_NAME;
            ProducerRecord<String, String> record = new ProducerRecord<>("service-health", key, healthData.toString());
            
            producer.send(record, (metadata, exception) -> {
                if (exception == null) {
                    logger.debug("Service health sent: topic={}, partition={}, offset={}", 
                            metadata.topic(), metadata.partition(), metadata.offset());
                } else {
                    logger.error("Error sending service health", exception);
                }
            });
        } catch (Exception e) {
            logger.error("Error creating/sending service health", e);
        }
    }
    
    private static double calculateDiskUsage() {
        try {
            long totalSpace = systemInfo.getOperatingSystem().getFileSystem().getFileStores().get(0).getTotalSpace();
            long freeSpace = systemInfo.getOperatingSystem().getFileSystem().getFileStores().get(0).getFreeSpace();
            
            if (totalSpace <= 0) {
                return 0.0;
            }
            
            return ((double)(totalSpace - freeSpace) / totalSpace) * 100;
        } catch (Exception e) {
            logger.error("Error calculating disk usage", e);
            return 0.0;
        }
    }
}