// api-gateway/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

// Express app setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Track connected clients
const clients = new Set();

// Store latest metrics for REST API
const latestMetrics = [];
const latestAnomalies = [];
const serviceHealth = {};

// Kafka setup with retry logic
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS || 'kafka:9093'],
  retry: {
    initialRetryTime: 1000,
    retries: 10,
    factor: 1.5,
    maxRetryTime: 10000
  }
});

// Create Kafka consumers
const metricsConsumer = kafka.consumer({ groupId: 'metrics-gateway-group' });
const anomaliesConsumer = kafka.consumer({ groupId: 'anomalies-gateway-group' });
const serviceHealthConsumer = kafka.consumer({ groupId: 'service-health-gateway-group' });

// Connect Kafka consumers with retry logic
async function connectConsumers() {
  try {
    // Connect metrics consumer
    await metricsConsumer.connect();
    await metricsConsumer.subscribe({ topic: 'metrics-data', fromBeginning: false });
    
    // Connect anomalies consumer
    await anomaliesConsumer.connect();
    await anomaliesConsumer.subscribe({ topic: 'alerts', fromBeginning: false });
    
    // Connect service health consumer
    await serviceHealthConsumer.connect();
    await serviceHealthConsumer.subscribe({ topic: 'service-health', fromBeginning: false });
    
    console.log('Kafka consumers connected successfully');
    
    // Start consuming
    await startConsuming();
  } catch (error) {
    console.error('Error connecting Kafka consumers:', error);
    
    // Handle connectivity error but don't crash - services might come up later
    setTimeout(() => {
      console.log('Retrying Kafka connection...');
      connectConsumers();
    }, 5000);
  }
}

// Start Kafka consumption
async function startConsuming() {
  // Metrics consumer
  await metricsConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const metricData = JSON.parse(message.value.toString());
        console.log('Received metric:', JSON.stringify(metricData).substring(0, 200) + (JSON.stringify(metricData).length > 200 ? '...' : ''));
        
        // Store latest metric and limit array size
        latestMetrics.push(metricData);
        if (latestMetrics.length > 100) {
          latestMetrics.shift();
        }
        
        // Broadcast to WebSocket clients
        broadcast('metrics', metricData);
      } catch (error) {
        console.error('Error processing metrics message:', error);
      }
    },
  });
  
  // Anomalies consumer
  await anomaliesConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const anomaly = JSON.parse(message.value.toString());
        console.log('Received anomaly:', anomaly);
        
        // Store latest anomaly and limit array size
        latestAnomalies.push(anomaly);
        if (latestAnomalies.length > 20) {
          latestAnomalies.shift();
        }
        
        // Broadcast to WebSocket clients
        broadcast('anomalies', anomaly);
      } catch (error) {
        console.error('Error processing anomaly message:', error);
      }
    },
  });
  
  // Service health consumer
  await serviceHealthConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const health = JSON.parse(message.value.toString());
        console.log('Received service health:', health);
        
        // Store latest service health
        serviceHealth[health.service] = health;
        
        // Broadcast to WebSocket clients
        broadcast('service-health', health);
      } catch (error) {
        console.error('Error processing service health message:', error);
      }
    },
  });
  
  console.log('Kafka consumers running');
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);
  
  // Send initial data to client
  ws.send(JSON.stringify({
    destination: '/topic/connection',
    body: JSON.stringify({ type: 'CONNECTION_SUCCESS', message: 'Connected to API Gateway' })
  }));
  
  // Handle client messages - STOMP-like protocol
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message from client:', data);
      
      // Handle SUBSCRIBE messages
      if (data.type === 'SUBSCRIBE') {
        console.log(`Client subscribed to ${data.destination}`);
        
        // Send some initial data for this subscription
        if (data.destination === '/topic/metrics' && latestMetrics.length > 0) {
          console.log(`Sending ${latestMetrics.length} initial metrics to new client`);
          latestMetrics.forEach(metric => {
            ws.send(JSON.stringify({
              destination: '/topic/metrics',
              body: JSON.stringify(metric)
            }));
          });
        }
        
        if (data.destination === '/topic/anomalies' && latestAnomalies.length > 0) {
          console.log(`Sending ${latestAnomalies.length} initial anomalies to new client`);
          latestAnomalies.forEach(anomaly => {
            ws.send(JSON.stringify({
              destination: '/topic/anomalies',
              body: JSON.stringify(anomaly)
            }));
          });
        }
        
        if (data.destination === '/topic/service-health' && Object.keys(serviceHealth).length > 0) {
          console.log(`Sending ${Object.keys(serviceHealth).length} service health entries to new client`);
          Object.values(serviceHealth).forEach(health => {
            ws.send(JSON.stringify({
              destination: '/topic/service-health',
              body: JSON.stringify(health)
            }));
          });
        }
      }
    } catch (error) {
      console.error('Error parsing client message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(topic, message) {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  const payload = JSON.stringify({
    destination: `/topic/${topic}`,
    body: messageStr
  });
  
  console.log(`Broadcasting to ${topic}: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? '...' : ''}`);
  
  let clientCount = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      clientCount++;
    }
  });
  console.log(`Message sent to ${clientCount} clients`);
}

// Root path handler
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Streaming Analytics API Gateway is running' });
});

// Health check endpoint
app.get('/actuator/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.status(200).json({ metrics: latestMetrics });
});

// Anomalies endpoint
app.get('/api/anomalies', (req, res) => {
  res.status(200).json({ anomalies: latestAnomalies });
});

// Service health endpoint
app.get('/api/service-health', (req, res) => {
  res.status(200).json({ serviceHealth });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, async () => {
  console.log(`API Gateway server running on port ${PORT}`);
  
  // Connect to Kafka and start consuming
  await connectConsumers().catch(err => {
    console.error('Initial Kafka connection failed:', err);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Disconnect Kafka consumers
  try {
    await metricsConsumer.disconnect();
    await anomaliesConsumer.disconnect();
    await serviceHealthConsumer.disconnect();
  } catch (err) {
    console.error('Error disconnecting Kafka consumers:', err);
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});