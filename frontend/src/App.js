import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
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
    console.log('Connecting to WebSocket at:', webSocketUrl);
    
    const webSocketService = new WebSocketService(webSocketUrl);
    
    webSocketService.connect({
      onConnect: () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to metrics topic
        webSocketService.subscribe('/topic/metrics', (message) => {
          try {
            console.log('Received metrics message:', message.body.substring(0, 200) + '...');
            const data = JSON.parse(message.body);
            
            setMetricsData(prevData => ({
              ...prevData,
              metrics: updateMetrics(prevData.metrics, data)
            }));
          } catch (error) {
            console.error('Error parsing metrics message:', error, message);
          }
        });
        
        // Subscribe to anomalies topic
        webSocketService.subscribe('/topic/anomalies', (message) => {
          try {
            console.log('Received anomaly message:', message.body);
            const anomaly = JSON.parse(message.body);
            
            setMetricsData(prevData => ({
              ...prevData,
              anomalies: [anomaly, ...prevData.anomalies].slice(0, 100) // Keep only the latest 100 anomalies
            }));
          } catch (error) {
            console.error('Error parsing anomaly message:', error);
          }
        });
        
        // Subscribe to service health topic
        webSocketService.subscribe('/topic/service-health', (message) => {
          try {
            console.log('Received service health message:', message.body);
            const healthData = JSON.parse(message.body);
            
            setMetricsData(prevData => ({
              ...prevData,
              serviceHealth: {
                ...prevData.serviceHealth,
                [healthData.service]: healthData
              }
            }));
          } catch (error) {
            console.error('Error parsing service health message:', error);
          }
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
      console.log('Disconnecting WebSocket');
      webSocketService.disconnect();
    };
  }, []);

  // Function to update metrics with new data
  const updateMetrics = (currentMetrics, newMetricData) => {
    console.log('Updating metrics with new data:', newMetricData);
    
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
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-gray-800 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12H15M12 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                
                {/* Navigation */}
                <nav className="ml-6 flex space-x-8">
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => 
                      `${isActive ? 'border-blue-400 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'} 
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`
                    }
                    end
                  >
                    Dashboard
                  </NavLink>
                  <NavLink 
                    to="/metrics" 
                    className={({ isActive }) => 
                      `${isActive ? 'border-blue-400 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'} 
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`
                    }
                  >
                    Metrics
                  </NavLink>
                  <NavLink 
                    to="/anomalies" 
                    className={({ isActive }) => 
                      `${isActive ? 'border-blue-400 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'} 
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`
                    }
                  >
                    Anomalies
                  </NavLink>
                  <NavLink 
                    to="/service-health" 
                    className={({ isActive }) => 
                      `${isActive ? 'border-blue-400 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'} 
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`
                    }
                  >
                    Service Health
                  </NavLink>
                  <NavLink 
                    to="/settings" 
                    className={({ isActive }) => 
                      `${isActive ? 'border-blue-400 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'} 
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`
                    }
                  >
                    Settings
                  </NavLink>
                </nav>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center">
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                
                {/* Notification bell icon */}
                <div className="ml-4">
                  <button className="text-gray-300 hover:text-white focus:outline-none">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              <Route path="/" element={<Dashboard metricsData={metricsData} />} />
              <Route path="/metrics" element={<MetricDetails metricsData={metricsData} />} />
              <Route path="/anomalies" element={<AnomalyDetection anomalies={metricsData.anomalies} />} />
              <Route path="/service-health" element={<ServiceHealth serviceHealth={metricsData.serviceHealth} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-center text-sm text-gray-500">
              Streaming Analytics Dashboard v1.0.0 © 2025
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;