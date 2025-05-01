package com.example.streaming.consumer;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;

public class MetricsConsumer {
    private static final Logger logger = LoggerFactory.getLogger(MetricsConsumer.class);
    private static final String BOOTSTRAP_SERVERS = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
    private static final String TOPIC_NAME = System.getenv().getOrDefault("KAFKA_TOPIC", "metrics-data");
    private static final String GROUP_ID = System.getenv().getOrDefault("KAFKA_GROUP_ID", "metrics-consumer-group");
    private static final AtomicBoolean running = new AtomicBoolean(true);
    
    public static void main(String[] args) {
        CountDownLatch latch = new CountDownLatch(1);
        
        Properties properties = new Properties();
        properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        properties.put(ConsumerConfig.GROUP_ID_CONFIG, GROUP_ID);
        properties.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        properties.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");
        
        // Create consumer thread
        Thread consumerThread = new Thread(() -> {
            try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(properties)) {
                consumer.subscribe(Collections.singletonList(TOPIC_NAME));
                
                logger.info("Consumer started, listening to topic: {}", TOPIC_NAME);
                
                while (running.get()) {
                    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                    
                    for (ConsumerRecord<String, String> record : records) {
                        try {
                            String key = record.key();
                            String value = record.value();
                            
                            logger.info("Received: key={}, value={}", key, value);
                            
                            // Parse the JSON and process metrics
                            JSONObject metricData = new JSONObject(value);
                            processMetric(metricData);
                            
                        } catch (Exception e) {
                            logger.error("Error processing record", e);
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Error in consumer", e);
            } finally {
                latch.countDown();
            }
        });
        
        // Start the consumer thread
        consumerThread.start();
        
        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            logger.info("Caught shutdown hook");
            running.set(false);
            try {
                latch.await();
            } catch (InterruptedException e) {
                logger.error("Error waiting for consumer to shutdown", e);
            }
            logger.info("Consumer has been gracefully shutdown");
        }));
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            logger.error("Application got interrupted", e);
        } finally {
            logger.info("Application is closing");
        }
    }
    
    private static void processMetric(JSONObject metricData) {
        String service = metricData.getString("service");
        String metric = metricData.getString("metric");
        double value = metricData.getDouble("value");
        long timestamp = metricData.getLong("timestamp");
        
        // In a real application, this would forward to a database, API, or messaging system
        logger.info("Processed metric: service={}, metric={}, value={}, timestamp={}", 
                service, metric, value, timestamp);
        
        // Check for anomalies (this is a simple example)
        if (metric.equals("cpu_usage") && value > 90) {
            logger.warn("ANOMALY DETECTED: High CPU usage for service {}: {}%", service, value);
        }
        else if (metric.equals("error_count") && value > 5) {
            logger.warn("ANOMALY DETECTED: High error count for service {}: {}", service, value);
        }
        else if (metric.equals("response_time") && value > 500) {
            logger.warn("ANOMALY DETECTED: High response time for service {}: {}ms", service, value);
        }
    }
}
