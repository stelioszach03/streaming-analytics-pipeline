// api-gateway/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Express app setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Sample data for demo
const services = ['api-gateway', 'auth-service', 'payment-service', 'user-service', 'order-service'];
const metrics = ['cpu_usage', 'memory_usage', 'response_time', 'error_count', 'request_count'];

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Send initial data to client
  ws.send(JSON.stringify({ type: 'CONNECTION_SUCCESS', message: 'Connected to API Gateway' }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message from client:', data);
      
      // Handle SUBSCRIBE messages
      if (data.type === 'SUBSCRIBE') {
        console.log(`Client subscribed to ${data.destination}`);
      }
    } catch (error) {
      console.error('Error parsing client message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast to all connected clients
function broadcast(topic, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        destination: `/topic/${topic}`,
        body: message
      }));
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

// API routes
app.get('/api/metrics', (req, res) => {
  // This would normally fetch from a database or cache
  res.status(200).json({ message: 'Metrics data endpoint' });
});

app.get('/api/anomalies', (req, res) => {
  // This would normally fetch from a database or cache
  res.status(200).json({ message: 'Anomalies data endpoint' });
});

app.get('/api/service-health', (req, res) => {
  // This would normally fetch from a database or cache
  res.status(200).json({ message: 'Service health data endpoint' });
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
      if (Math.random() < 0.05) {
        value = value * 3;  // Triple the value to simulate an anomaly
      }
      
      // Create metric data
      const metricData = {
        id: `sample-${service}-${metric}-${Date.now()}`,
        timestamp: Date.now(),
        service: service,
        metric: metric,
        value: value,
        host: `host-${Math.floor(Math.random() * 5) + 1}`,
        region: Math.random() > 0.5 ? 'us-east' : 'us-west'
      };
      
      // Broadcast to WebSocket clients
      broadcast('metrics', JSON.stringify(metricData));
      
      // Check for anomalies
      const isAnomaly = (metric === 'cpu_usage' && value > 90) ||
                         (metric === 'response_time' && value > 500) ||
                         (metric === 'error_count' && value > 5);
      
      if (isAnomaly) {
        const anomaly = {
          ...metricData,
          expected_value: metricData.value / 3,
          deviation: 2.0,
          severity: value > 90 ? 'high' : value > 70 ? 'medium' : 'low'
        };
        
        broadcast('anomalies', JSON.stringify(anomaly));
      }
    });
    
    // Generate service health
    const serviceHealth = {
      service: service,
      timestamp: Date.now(),
      status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.6 ? 'warning' : 'healthy',
      metrics_count: 10 + Math.floor(Math.random() * 90),
      anomalies_count: Math.floor(Math.random() * 10),
      avg_response_time: 50 + Math.random() * 450,
      avg_cpu_usage: 10 + Math.random() * 80,
      avg_memory_usage: 20 + Math.random() * 60
    };
    
    broadcast('service-health', JSON.stringify(serviceHealth));
  });
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`API Gateway server running on port ${PORT}`);
  
  // Generate sample data every 5 seconds
  sampleDataInterval = setInterval(generateSampleData, 5000);
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