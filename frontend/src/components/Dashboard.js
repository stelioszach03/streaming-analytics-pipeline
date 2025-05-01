import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const Dashboard = ({ metricsData }) => {
  const [serviceMetrics, setServiceMetrics] = useState({});
  const [topAnomalies, setTopAnomalies] = useState([]);
  
  useEffect(() => {
    // Process and organize metrics by service
    const metricsByService = {};
    
    metricsData.metrics.forEach(metric => {
      if (!metricsByService[metric.service]) {
        metricsByService[metric.service] = {};
      }
      
      metricsByService[metric.service][metric.metric] = {
        value: metric.value,
        timestamp: metric.timestamp,
        history: metric.history || []
      };
    });
    
    setServiceMetrics(metricsByService);
    
    // Get the most recent anomalies (up to 5)
    setTopAnomalies(metricsData.anomalies.slice(0, 5));
  }, [metricsData]);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };
  
  // Format data for charts
  const formatChartData = (history) => {
    if (!history || history.length === 0) return [];
    
    return history.map(point => ({
      time: formatTimestamp(point.timestamp),
      value: point.value,
      timestamp: point.timestamp
    }));
  };
  
  // Get color based on metric type
  const getMetricColor = (metricName) => {
    switch(metricName) {
      case 'cpu_usage':
        return '#3498db';
      case 'memory_usage':
        return '#2ecc71';
      case 'response_time':
        return '#e67e22';
      case 'error_count':
        return '#e74c3c';
      case 'request_count':
        return '#9b59b6';
      default:
        return '#34495e';
    }
  };
  
  return (
    <div className="dashboard">
      <h2>Real-Time Service Metrics</h2>
      
      {Object.keys(serviceMetrics).length === 0 ? (
        <div className="loading-placeholder">
          <p>Waiting for metrics data...</p>
        </div>
      ) : (
        <>
          {/* Service Metrics Cards */}
          {Object.entries(serviceMetrics).map(([serviceName, metrics]) => (
            <div key={serviceName} className="service-section">
              <h3>{serviceName}</h3>
              <div className="dashboard-grid">
                {Object.entries(metrics).map(([metricName, metricData]) => (
                  <div key={`${serviceName}-${metricName}`} className="dashboard-card">
                    <div className="dashboard-card-header">
                      <span className="dashboard-card-title">{metricName.replace('_', ' ')}</span>
                      <span className="timestamp">{formatTimestamp(metricData.timestamp)}</span>
                    </div>
                    <div className="dashboard-card-value">
                      {metricData.value.toFixed(2)}
                      {metricName === 'cpu_usage' || metricName === 'memory_usage' ? '%' : ''}
                      {metricName === 'response_time' ? 'ms' : ''}
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={formatChartData(metricData.history)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(label) => `Time: ${label}`}
                            formatter={(value) => [
                              `${value.toFixed(2)}${metricName === 'cpu_usage' || metricName === 'memory_usage' ? '%' : metricName === 'response_time' ? 'ms' : ''}`,
                              metricName.replace('_', ' ')
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={getMetricColor(metricName)} 
                            dot={false} 
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Recent Anomalies */}
          <div className="anomalies-section">
            <h3>Recent Anomalies</h3>
            {topAnomalies.length === 0 ? (
              <p>No anomalies detected.</p>
            ) : (
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Expected</th>
                    <th>Deviation</th>
                    <th>Time</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {topAnomalies.map((anomaly, index) => (
                    <tr key={index}>
                      <td>{anomaly.service}</td>
                      <td>{anomaly.metric}</td>
                      <td>{anomaly.value.toFixed(2)}</td>
                      <td>{anomaly.expected_value ? anomaly.expected_value.toFixed(2) : 'N/A'}</td>
                      <td>{anomaly.deviation ? `${(anomaly.deviation * 100).toFixed(1)}%` : 'N/A'}</td>
                      <td>{formatTimestamp(anomaly.timestamp)}</td>
                      <td>
                        <span className={`anomaly-badge ${anomaly.severity}`}>
                          {anomaly.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Service Health Summary */}
          <div className="health-section">
            <h3>Service Health</h3>
            {Object.keys(metricsData.serviceHealth).length === 0 ? (
              <p>No service health data available.</p>
            ) : (
              <div className="dashboard-grid">
                {Object.entries(metricsData.serviceHealth).map(([serviceName, health]) => (
                  <div key={serviceName} className="dashboard-card">
                    <div className="dashboard-card-header">
                      <span className="dashboard-card-title">{serviceName}</span>
                      <span className={`health-status ${health.status.toLowerCase()}`}>
                        {health.status}
                      </span>
                    </div>
                    <div className="health-stats">
                      <p><strong>Response Time:</strong> {health.avg_response_time.toFixed(2)}ms</p>
                      <p><strong>CPU Usage:</strong> {health.avg_cpu_usage.toFixed(2)}%</p>
                      <p><strong>Memory Usage:</strong> {health.avg_memory_usage.toFixed(2)}%</p>
                      <p><strong>Metrics Count:</strong> {health.metrics_count}</p>
                      <p><strong>Anomalies:</strong> {health.anomalies_count}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
