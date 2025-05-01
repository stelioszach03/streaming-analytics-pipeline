// api-gateway/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
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

// Sample data for demo
const services = ['api-gateway', 'auth-service', 'payment-service', 'user-service', 'order-service'];
const metrics = ['cpu_usage', 'memory_usage', 'response_time', 'error_count', 'request_count'];

// Store latest metrics for REST API
let latestMetrics = [];
let latestAnomalies = [];
let serviceHealth = {};

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
          latestMetrics.forEach(metric => {
            ws.send(JSON.stringify({
              destination: '/topic/metrics',
              body: JSON.stringify(metric)
            }));
          });
        }
        
        if (data.destination === '/topic/anomalies' && latestAnomalies.length > 0) {
          latestAnomalies.forEach(anomaly => {
            ws.send(JSON.stringify({
              destination: '/topic/anomalies',
              body: JSON.stringify(anomaly)
            }));
          });
        }
        
        if (data.destination === '/topic/service-health' && Object.keys(serviceHealth).length > 0) {
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
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
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

// Generate sample data for testing
let sampleDataInterval;

function generateSampleData() {
  // Generate for each service and metric combination
  services.forEach(service => {
    metrics.forEach(metric => {
      // Generate random metric value
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
      
      // Occasionally generate anomalies
      const isAnomaly = Math.random() < 0.05;
      if (isAnomaly) {
        value = value * 3;  // Triple the value to simulate an anomaly
      }
      
      // Create metric data
      const metricData = {
        id: uuidv4(),
        timestamp: Date.now(),
        service: service,
        metric: metric,
        value: value,
        host: `host-${Math.floor(Math.random() * 5) + 1}`,
        region: Math.random() > 0.5 ? 'us-east' : 'us-west'
      };
      
      // Store latest metric and limit array size
      latestMetrics.push(metricData);
      if (latestMetrics.length > 100) {
        latestMetrics.shift();
      }
      
      // Broadcast to WebSocket clients
      broadcast('metrics', metricData);
      
      // Check for anomalies
      if (isAnomaly || 
         (metric === 'cpu_usage' && value > 90) ||
         (metric === 'response_time' && value > 500) ||
         (metric === 'error_count' && value > 5)) {
        
        const anomaly = {
          ...metricData,
          expected_value: metricData.value / 3,
          deviation: 2.0,
          severity: value > 90 ? 'high' : value > 70 ? 'medium' : 'low'
        };
        
        // Store latest anomaly and limit array size
        latestAnomalies.push(anomaly);
        if (latestAnomalies.length > 20) {
          latestAnomalies.shift();
        }
        
        broadcast('anomalies', anomaly);
      }
    });
    
    // Generate service health
    const cpuUsage = 10 + Math.random() * 80;
    const memoryUsage = 20 + Math.random() * 60;
    const responseTime = 50 + Math.random() * 450;
    
    // Determine health status based on metrics
    let status = 'healthy';
    if (cpuUsage > 80 || memoryUsage > 80 || responseTime > 500) {
      status = 'critical';
    } else if (cpuUsage > 60 || memoryUsage > 60 || responseTime > 200) {
      status = 'warning';
    }
    
    const health = {
      service: service,
      timestamp: Date.now(),
      status: status,
      metrics_count: 10 + Math.floor(Math.random() * 90),
      anomalies_count: Math.floor(Math.random() * 10),
      avg_response_time: responseTime,
      avg_cpu_usage: cpuUsage,
      avg_memory_usage: memoryUsage
    };
    
    // Store latest service health
    serviceHealth[service] = health;
    
    broadcast('service-health', health);
  });
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`API Gateway server running on port ${PORT}`);
  
  // Generate sample data every 5 seconds
  sampleDataInterval = setInterval(generateSampleData, 5000);
  
  // Generate initial data
  generateSampleData();
  
  console.log('Sample data generator started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  clearInterval(sampleDataInterval);
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});