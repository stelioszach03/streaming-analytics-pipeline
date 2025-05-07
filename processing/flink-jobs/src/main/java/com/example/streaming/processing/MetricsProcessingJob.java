package com.example.streaming.processing;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.FilterFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.functions.RichFlatMapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.TypeHint;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.api.java.tuple.Tuple4;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

// New Elasticsearch connector imports
import org.apache.flink.connector.elasticsearch.sink.Elasticsearch7SinkBuilder;
import org.apache.flink.connector.elasticsearch.sink.RequestIndexer;
import org.apache.http.HttpHost;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.client.Requests;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

public class MetricsProcessingJob {
    private static final Logger LOG = LoggerFactory.getLogger(MetricsProcessingJob.class);
    
    // Side output for anomalies
    private static final OutputTag<MetricEvent> anomalyOutputTag = new OutputTag<MetricEvent>("anomalies"){};
    
    public static void main(String[] args) throws Exception {
        // Set up the execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure Kafka source
        String bootstrapServers = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092");
        String sourceTopic = System.getenv().getOrDefault("KAFKA_SOURCE_TOPIC", "metrics-data");
        String sinkTopic = System.getenv().getOrDefault("KAFKA_SINK_TOPIC", "processed-metrics");
        String alertsTopic = System.getenv().getOrDefault("KAFKA_ALERTS_TOPIC", "alerts");
        String consumerGroup = System.getenv().getOrDefault("KAFKA_CONSUMER_GROUP", "flink-metrics-processor");
        
        // Elasticsearch configuration
        String elasticsearchHost = System.getenv().getOrDefault("ELASTICSEARCH_HOST", "elasticsearch");
        int elasticsearchPort = Integer.parseInt(System.getenv().getOrDefault("ELASTICSEARCH_PORT", "9200"));
        String elasticsearchIndex = System.getenv().getOrDefault("ELASTICSEARCH_INDEX", "metrics");
        
        // Kafka source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(bootstrapServers)
                .setTopics(sourceTopic)
                .setGroupId(consumerGroup)
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();
        
        // Kafka sinks
        KafkaSink<String> processedSink = KafkaSink.<String>builder()
                .setBootstrapServers(bootstrapServers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic(sinkTopic)
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .setDeliveryGuarantee(DeliveryGuarantee.AT_LEAST_ONCE)
                .build();
        
        KafkaSink<String> alertsSink = KafkaSink.<String>builder()
                .setBootstrapServers(bootstrapServers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic(alertsTopic)
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .setDeliveryGuarantee(DeliveryGuarantee.AT_LEAST_ONCE)
                .build();
        
        // Read from Kafka
        DataStream<String> inputStream = env.fromSource(
                source,
                WatermarkStrategy.<String>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                        .withTimestampAssigner((event, timestamp) -> {
                            JSONObject jsonEvent = new JSONObject(event);
                            return jsonEvent.getLong("timestamp");
                        }),
                "Kafka Source");
        
        // Parse the JSON into MetricEvent objects
        DataStream<MetricEvent> metricStream = inputStream.map(new MapFunction<String, MetricEvent>() {
            @Override
            public MetricEvent map(String value) throws Exception {
                JSONObject json = new JSONObject(value);
                return new MetricEvent(
                        json.getString("id"),
                        json.getLong("timestamp"),
                        json.getString("service"),
                        json.getString("metric"),
                        json.getDouble("value"),
                        json.getString("host"),
                        json.getString("region")
                );
            }
        });
        
        // Detect anomalies using a stateful operation - note: using SingleOutputStreamOperator
        // to properly handle side outputs
        SingleOutputStreamOperator<MetricEvent> processedStream = metricStream
                .keyBy(event -> event.getService() + "-" + event.getMetric())
                .flatMap(new AnomalyDetector());
        
        // Extract anomalies using side output - correct API for Flink 1.17
        DataStream<MetricEvent> anomalyStream = processedStream.getSideOutput(anomalyOutputTag);
        
        // Window operations for aggregations (every minute)
        DataStream<AggregatedMetric> windowedAggregations = metricStream
                .keyBy(event -> event.getService() + "-" + event.getMetric())
                .window(TumblingEventTimeWindows.of(Time.minutes(1)))
                .process(new MetricAggregator());
        
        // Convert back to JSON for Kafka sink
        DataStream<String> processedJsonStream = processedStream.map(MetricEvent::toJsonString);
        DataStream<String> anomalyJsonStream = anomalyStream.map(event -> {
            JSONObject alertJson = new JSONObject(event.toJsonString());
            alertJson.put("alert_type", "anomaly");
            alertJson.put("alert_message", "Anomaly detected for " + event.getService() + " " + event.getMetric());
            alertJson.put("severity", "high");
            return alertJson.toString();
        });
        
        // Send processed data to Kafka
        processedJsonStream.sinkTo(processedSink);
        
        // Send alerts to Kafka
        anomalyJsonStream.sinkTo(alertsSink);
        
        // Send aggregated metrics to Elasticsearch using the new Elasticsearch connector
        final List<HttpHost> httpHosts = new ArrayList<>();
        httpHosts.add(new HttpHost(elasticsearchHost, elasticsearchPort, "http"));
        
        windowedAggregations.sinkTo(
            new Elasticsearch7SinkBuilder<AggregatedMetric>()
                .setHosts(httpHosts.toArray(new HttpHost[0]))
                .setEmitter((element, context, indexer) -> {
                    Map<String, Object> document = new HashMap<>();
                    document.put("service", element.getService());
                    document.put("metric", element.getMetric());
                    document.put("timestamp", element.getTimestamp());
                    document.put("min", element.getMin());
                    document.put("max", element.getMax());
                    document.put("avg", element.getAvg());
                    document.put("count", element.getCount());
                    document.put("window_start", element.getWindowStart());
                    document.put("window_end", element.getWindowEnd());
                    
                    IndexRequest indexRequest = Requests.indexRequest()
                            .index(elasticsearchIndex)
                            .source(document);
                    
                    indexer.add(indexRequest);
                })
                .build()
        );
        
        // Execute the streaming pipeline
        env.execute("Metrics Processing Job");
    }
    
    /**
     * Anomaly detector using stateful operations to maintain running statistics
     */
    public static class AnomalyDetector extends RichFlatMapFunction<MetricEvent, MetricEvent> {
        private transient ValueState<MetricStats> statsState;
        
        @Override
        public void open(Configuration parameters) throws Exception {
            ValueStateDescriptor<MetricStats> descriptor = 
                    new ValueStateDescriptor<>("metric-stats", TypeInformation.of(new TypeHint<MetricStats>() {}));
            statsState = getRuntimeContext().getState(descriptor);
        }
        
        @Override
        public void flatMap(MetricEvent event, Collector<MetricEvent> out) throws Exception {
            // Get current stats or initialize if not exists
            MetricStats stats = statsState.value();
            if (stats == null) {
                stats = new MetricStats(event.getValue(), event.getValue(), event.getValue(), 1);
            } else {
                // Update stats with new data point
                double newValue = event.getValue();
                stats = new MetricStats(
                        Math.min(stats.getMin(), newValue),
                        Math.max(stats.getMax(), newValue),
                        ((stats.getAvg() * stats.getCount()) + newValue) / (stats.getCount() + 1),
                        stats.getCount() + 1
                );
            }
            
            // Save updated stats
            statsState.update(stats);
            
            // Detect anomalies (simple algorithm: > 2 standard deviations from mean)
            // In a real system, this would be much more sophisticated
            if (stats.getCount() > 10) {  // Ensure we have enough data points
                double stdDev = Math.sqrt(
                        0.1 * Math.pow(stats.getMax() - stats.getMin(), 2)  // Simplified std dev approximation
                );
                
                boolean isAnomaly = Math.abs(event.getValue() - stats.getAvg()) > 2 * stdDev;
                
                if (isAnomaly) {
                    // Output to side output for anomalies
                    getRuntimeContext().getOutput(anomalyOutputTag, event);
                }
            }
            
            // Main output with the original event
            out.collect(event);
        }
    }
    
    /**
     * Window function for aggregating metrics
     */
    public static class MetricAggregator extends ProcessWindowFunction
            MetricEvent, AggregatedMetric, String, TimeWindow> {
        
        @Override
        public void process(
                String key,
                ProcessWindowFunction<MetricEvent, AggregatedMetric, String, TimeWindow>.Context context,
                Iterable<MetricEvent> elements,
                Collector<AggregatedMetric> out) throws Exception {
            
            double min = Double.MAX_VALUE;
            double max = Double.MIN_VALUE;
            double sum = 0;
            long count = 0;
            String service = "";
            String metric = "";
            
            for (MetricEvent event : elements) {
                min = Math.min(min, event.getValue());
                max = Math.max(max, event.getValue());
                sum += event.getValue();
                count++;
                service = event.getService();
                metric = event.getMetric();
            }
            
            if (count > 0) {
                out.collect(new AggregatedMetric(
                        System.currentTimeMillis(),
                        service,
                        metric,
                        min,
                        max,
                        sum / count,
                        count,
                        context.window().getStart(),
                        context.window().getEnd()
                ));
            }
        }
    }
    
    /**
     * POJO representing a metric event
     */
    public static class MetricEvent {
        private String id;
        private long timestamp;
        private String service;
        private String metric;
        private double value;
        private String host;
        private String region;
        
        public MetricEvent() {
        }
        
        public MetricEvent(String id, long timestamp, String service, String metric, 
                          double value, String host, String region) {
            this.id = id;
            this.timestamp = timestamp;
            this.service = service;
            this.metric = metric;
            this.value = value;
            this.host = host;
            this.region = region;
        }
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        
        public String getService() { return service; }
        public void setService(String service) { this.service = service; }
        
        public String getMetric() { return metric; }
        public void setMetric(String metric) { this.metric = metric; }
        
        public double getValue() { return value; }
        public void setValue(double value) { this.value = value; }
        
        public String getHost() { return host; }
        public void setHost(String host) { this.host = host; }
        
        public String getRegion() { return region; }
        public void setRegion(String region) { this.region = region; }
        
        public String toJsonString() {
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("timestamp", timestamp);
            json.put("service", service);
            json.put("metric", metric);
            json.put("value", value);
            json.put("host", host);
            json.put("region", region);
            return json.toString();
        }
    }
    
    /**
     * POJO for storing metric statistics
     */
    public static class MetricStats {
        private double min;
        private double max;
        private double avg;
        private long count;
        
        public MetricStats() {
        }
        
        public MetricStats(double min, double max, double avg, long count) {
            this.min = min;
            this.max = max;
            this.avg = avg;
            this.count = count;
        }
        
        public double getMin() { return min; }
        public void setMin(double min) { this.min = min; }
        
        public double getMax() { return max; }
        public void setMax(double max) { this.max = max; }
        
        public double getAvg() { return avg; }
        public void setAvg(double avg) { this.avg = avg; }
        
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
    
    /**
     * POJO for aggregated metrics
     */
    public static class AggregatedMetric {
        private long timestamp;
        private String service;
        private String metric;
        private double min;
        private double max;
        private double avg;
        private long count;
        private long windowStart;
        private long windowEnd;
        
        public AggregatedMetric() {
        }
        
        public AggregatedMetric(long timestamp, String service, String metric,
                               double min, double max, double avg, long count,
                               long windowStart, long windowEnd) {
            this.timestamp = timestamp;
            this.service = service;
            this.metric = metric;
            this.min = min;
            this.max = max;
            this.avg = avg;
            this.count = count;
            this.windowStart = windowStart;
            this.windowEnd = windowEnd;
        }
        
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        
        public String getService() { return service; }
        public void setService(String service) { this.service = service; }
        
        public String getMetric() { return metric; }
        public void setMetric(String metric) { this.metric = metric; }
        
        public double getMin() { return min; }
        public void setMin(double min) { this.min = min; }
        
        public double getMax() { return max; }
        public void setMax(double max) { this.max = max; }
        
        public double getAvg() { return avg; }
        public void setAvg(double avg) { this.avg = avg; }
        
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        
        public long getWindowStart() { return windowStart; }
        public void setWindowStart(long windowStart) { this.windowStart = windowStart; }
        
        public long getWindowEnd() { return windowEnd; }
        public void setWindowEnd(long windowEnd) { this.windowEnd = windowEnd; }
    }
}