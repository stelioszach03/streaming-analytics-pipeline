const k6 = require('k6');
const http = require('k6/http');
const metrics = require('k6/metrics');
const ws = require('k6/ws');
const { check, sleep } = require('k6');

// Define custom metrics
const kafkaProducerSuccessRate = new metrics.Rate('kafka_producer_success_rate');
const kafkaProducerRequestDuration = new metrics.Trend('kafka_producer_request_duration');
const wsConnectionSuccessRate = new metrics.Rate('ws_connection_success_rate');
const wsMessageSuccessRate = new metrics.Rate('ws_message_success_rate');

// Configuration
const config = {
  // Base URLs
  apiGatewayUrl: __ENV.API_GATEWAY_URL || 'http://api.streaming-analytics.local',
  kafkaRestProxyUrl: __ENV.KAFKA_REST_PROXY_URL || 'http://kafka-rest-proxy.streaming-analytics.local',
  wsUrl: __ENV.WS_URL || 'ws://api.streaming-analytics.local/ws',
  
  // Test duration and VUs configuration
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users over 30 seconds
    { duration: '2m', target: 50 },    // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },    // Stay at 50 users for 5 minutes
    { duration: '1m', target: 0 },     // Ramp down to 0 users over 1 minute
  ],
  
  // Services to generate metrics for
  services: ['api-gateway', 'auth-service', 'payment-service', 'user-service', 'order-service'],
  
  // Metrics to generate
  metrics: ['cpu_usage', 'memory_usage', 'response_time', 'error_count', 'request_count'],
  
  // Regions
  regions: ['us-east', 'us-west', 'eu-central', 'ap-southeast'],
  
  // Hosts (simulated servers)
  hostCount: 10,
  
  // Anomaly settings
  anomalyProbability: 0.05, // 5% chance of generating an anomaly
  
  // Message rate configuration
  messageRate: {
    min: 1,   // Minimum messages per second per VU
    max: 10,  // Maximum messages per second per VU
  }
};

// Test options
exports.options = {
  scenarios: {
    kafka_producer_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: config.stages,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'kafka_producer_success_rate': ['rate>0.95'], // 95% success rate
    'http_req_duration': ['p(95)<1000'],          // 95% of requests should be below 1s
    'ws_connection_success_rate': ['rate>0.9'],   // 90% websocket connection success rate
  },
};

// Setup function (runs once per VU)
exports.setup = function() {
  console.log('Starting load test for streaming analytics pipeline');
  
  // Test API Gateway health
  const apiHealthRes = http.get(`${config.apiGatewayUrl}/actuator/health`);
  check(apiHealthRes, {
    'API Gateway is healthy': (r) => r.status === 200 && r.json('status') === 'UP',
  });
  
  return config;
};

// Main function (executes for each VU)
exports.default = function(config) {
  // Each VU will represent a different client producing messages
  const clientId = `load-generator-${__VU}-${__ITER}`;
  
  // Randomly select a service, metric, region, and host for this batch of messages
  const service = config.services[Math.floor(Math.random() * config.services.length)];
  const metric = config.metrics[Math.floor(Math.random() * config.metrics.length)];
  const region = config.regions[Math.floor(Math.random() * config.regions.length)];
  const host = `host-${Math.floor(Math.random() * config.hostCount) + 1}`;
  
  // Determine how many messages to send in this iteration (random within the configured range)
  const messagesPerIteration = Math.floor(Math.random() * (config.messageRate.max - config.messageRate.min + 1)) + config.messageRate.min;
  
  // Send messages
  for (let i = 0; i < messagesPerIteration; i++) {
    // Generate a random metric value based on the metric type
    let value;
    switch (metric) {
      case 'cpu_usage':
        value = 10 + Math.random() * 90; // 10-100%
        break;
      case 'memory_usage':
        value = 20 + Math.random() * 70; // 20-90%
        break;
      case 'response_time':
        value = 10 + Math.random() * 990; // 10-1000ms
        break;
      case 'error_count':
        value = Math.floor(Math.random() * 10); // 0-10 errors
        break;
      case 'request_count':
        value = 10 + Math.floor(Math.random() * 990); // 10-1000 requests
        break;
      default:
        value = Math.random() * 100;
    }
    
    // Occasionally generate an anomaly
    if (Math.random() < config.anomalyProbability) {
      value = value * 3;  // Triple the normal value to simulate an anomaly
    }
    
    // Create the metric message
    const metricMessage = {
      id: `${clientId}-${Date.now()}-${i}`,
      timestamp: Date.now(),
      service: service,
      metric: metric,
      value: value,
      host: host,
      region: region
    };
    
    // Send the metric message to the Kafka REST Proxy
    const producerResponse = http.post(`${config.kafkaRestProxyUrl}/topics/metrics-data`, 
      JSON.stringify({
        records: [
          {
            key: `${service}-${metric}`,
            value: metricMessage
          }
        ]
      }),
      {
        headers: {
          'Content-Type': 'application/vnd.kafka.json.v2+json',
          'Accept': 'application/vnd.kafka.v2+json',
          'X-Client-ID': clientId
        }
      }
    );
    
    // Record metrics for Kafka producer request
    kafkaProducerSuccessRate.add(producerResponse.status === 200);
    kafkaProducerRequestDuration.add(producerResponse.timings.duration);
    
    // Check if the request was successful
    check(producerResponse, {
      'Kafka message sent successfully': (r) => r.status === 200,
    });
  }
  
  // Occasionally establish a WebSocket connection to simulate dashboard clients
  if (Math.random() < 0.2) { // 20% chance per iteration
    const wsRes = ws.connect(config.wsUrl, {}, function(socket) {
      wsConnectionSuccessRate.add(1);
      
      socket.on('open', function() {
        // Subscribe to topics
        socket.send(JSON.stringify({
          type: 'SUBSCRIBE',
          destination: '/topic/metrics'
        }));
        
        socket.send(JSON.stringify({
          type: 'SUBSCRIBE',
          destination: '/topic/anomalies'
        }));
        
        socket.send(JSON.stringify({
          type: 'SUBSCRIBE',
          destination: '/topic/service-health'
        }));
        
        // Listen for messages
        socket.on('message', function(message) {
          wsMessageSuccessRate.add(1);
          
          // Check message is valid JSON
          try {
            JSON.parse(message);
          } catch (e) {
            wsMessageSuccessRate.add(0);
          }
        });
        
        // Keep the connection open for a short time
        socket.setTimeout(function() {
          socket.close();
        }, 10000); // 10 seconds
      });
      
      socket.on('error', function(e) {
        wsConnectionSuccessRate.add(0);
        console.error('WebSocket error: ', e);
      });
    });
    
    check(wsRes, {
      'WebSocket connection established': (r) => r === true,
    });
  }
  
  // Sleep for a random time (1-3 seconds) before the next iteration
  sleep(1 + Math.random() * 2);
}

// Teardown function (runs at the end of the test)
exports.teardown = function(config) {
  console.log('Completed load test for streaming analytics pipeline');
};
