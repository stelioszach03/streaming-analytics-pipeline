import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import MetricDetails from './components/MetricDetails';
import AnomalyDetection from './components/AnomalyDetection';
import ServiceHealth from './components/ServiceHealth';
import Settings from './components/Settings';
import WebSocketService from './services/WebSocketService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [metricsData, setMetricsData] = useState({
    metrics: [],
    anomalies: [],
    serviceHealth: {}
  });

  useEffect(() => {
    // Initialize WebSocket connection
    const webSocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080/ws';
    const webSocketService = new WebSocketService(webSocketUrl);
    
    webSocketService.connect({
      onConnect: () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to metrics topic
        webSocketService.subscribe('/topic/metrics', (message) => {
          const data = JSON.parse(message.body);
          setMetricsData(prevData => ({
            ...prevData,
            metrics: updateMetrics(prevData.metrics, data)
          }));
        });
        
        // Subscribe to anomalies topic
        webSocketService.subscribe('/topic/anomalies', (message) => {
          const anomaly = JSON.parse(message.body);
          setMetricsData(prevData => ({
            ...prevData,
            anomalies: [anomaly, ...prevData.anomalies].slice(0, 100) // Keep only the latest 100 anomalies
          }));
        });
        
        // Subscribe to service health topic
        webSocketService.subscribe('/topic/service-health', (message) => {
          const healthData = JSON.parse(message.body);
          setMetricsData(prevData => ({
            ...prevData,
            serviceHealth: {
              ...prevData.serviceHealth,
              [healthData.service]: healthData
            }
          }));
        });
      },
      
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      },
      
      onError: (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Function to update metrics with new data
  const updateMetrics = (currentMetrics, newMetricData) => {
    const metricKey = `${newMetricData.service}-${newMetricData.metric}`;
    const existingMetricIndex = currentMetrics.findIndex(m => 
      m.service === newMetricData.service && m.metric === newMetricData.metric
    );
    
    if (existingMetricIndex >= 0) {
      // Update existing metric
      const updatedMetrics = [...currentMetrics];
      const existingMetric = updatedMetrics[existingMetricIndex];
      
      // Add new data point to history
      const updatedHistory = [...(existingMetric.history || []), {
        timestamp: newMetricData.timestamp,
        value: newMetricData.value
      }];
      
      // Keep only the latest 100 data points for performance
      const trimmedHistory = updatedHistory.slice(-100);
      
      updatedMetrics[existingMetricIndex] = {
        ...existingMetric,
        value: newMetricData.value,
        timestamp: newMetricData.timestamp,
        history: trimmedHistory
      };
      
      return updatedMetrics;
    } else {
      // Add new metric
      return [...currentMetrics, {
        ...newMetricData,
        history: [{
          timestamp: newMetricData.timestamp,
          value: newMetricData.value
        }]
      }];
    }
  };

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>Streaming Analytics Dashboard</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </header>
        
        <nav className="app-nav">
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/metrics">Metric Details</Link></li>
            <li><Link to="/anomalies">Anomaly Detection</Link></li>
            <li><Link to="/service-health">Service Health</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </nav>
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard metricsData={metricsData} />} />
            <Route path="/metrics" element={<MetricDetails metricsData={metricsData} />} />
            <Route path="/anomalies" element={<AnomalyDetection anomalies={metricsData.anomalies} />} />
            <Route path="/service-health" element={<ServiceHealth serviceHealth={metricsData.serviceHealth} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>Streaming Analytics Dashboard v1.0.0</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
