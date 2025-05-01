package com.example.streaming.producer;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MetricsProducer {
    private static final Logger logger = LoggerFactory.getLogger(MetricsProducer.class);
    private static final String BOOTSTRAP_SERVERS = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
    private static final String TOPIC_NAME = System.getenv().getOrDefault("KAFKA_TOPIC", "metrics-data");
    private static final Random random = new Random();
    private static final String[] SERVICES = {"api-gateway", "auth-service", "payment-service", "user-service", "order-service"};
    private static final String[] METRICS = {"cpu_usage", "memory_usage", "response_time", "error_count", "request_count"};
    
    public static void main(String[] args) {
        Properties properties = new Properties();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.ACKS_CONFIG, "all");
        properties.put(ProducerConfig.RETRIES_CONFIG, 3);
        properties.put(ProducerConfig.LINGER_MS_CONFIG, 1);
        properties.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        try (KafkaProducer<String, String> producer = new KafkaProducer<>(properties)) {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            
            scheduler.scheduleAtFixedRate(() -> {
                try {
                    for (String service : SERVICES) {
                        for (String metric : METRICS) {
                            JSONObject data = generateMetricData(service, metric);
                            String key = service + "-" + metric;
                            String value = data.toString();
                            
                            ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, key, value);
                            producer.send(record, (metadata, exception) -> {
                                if (exception == null) {
                                    logger.info("Message sent: topic={}, partition={}, offset={}", 
                                            metadata.topic(), metadata.partition(), metadata.offset());
                                } else {
                                    logger.error("Error sending message", exception);
                                }
                            });
                        }
                    }
                } catch (Exception e) {
                    logger.error("Error in scheduled task", e);
                }
            }, 0, 1, TimeUnit.SECONDS);
            
            // Keep the application running
            try {
                Thread.sleep(Long.MAX_VALUE);
            } catch (InterruptedException e) {
                logger.info("Producer interrupted, shutting down");
                scheduler.shutdown();
            }
        }
    }
    
    private static JSONObject generateMetricData(String service, String metric) {
        JSONObject data = new JSONObject();
        data.put("id", UUID.randomUUID().toString());
        data.put("timestamp", System.currentTimeMillis());
        data.put("service", service);
        data.put("metric", metric);
        
        double value;
        switch (metric) {
            case "cpu_usage":
                value = 10 + random.nextDouble() * 90; // 10-100%
                break;
            case "memory_usage":
                value = 20 + random.nextDouble() * 70; // 20-90%
                break;
            case "response_time":
                value = 10 + random.nextDouble() * 990; // 10-1000ms
                break;
            case "error_count":
                value = random.nextInt(10); // 0-10 errors
                break;
            case "request_count":
                value = 10 + random.nextInt(990); // 10-1000 requests
                break;
            default:
                value = random.nextDouble() * 100;
        }
        
        // Add some anomalies occasionally
        if (random.nextInt(100) < 5) {  // 5% chance of anomaly
            value = value * 3;  // Triple the normal value to simulate an anomaly
        }
        
        data.put("value", value);
        
        // Add some additional metadata
        data.put("host", "host-" + (random.nextInt(5) + 1));
        data.put("region", random.nextBoolean() ? "us-east" : "us-west");
        
        return data;
    }
}
