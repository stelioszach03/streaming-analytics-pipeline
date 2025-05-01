import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { format } from 'date-fns';

const MetricDetails = ({ metricsData }) => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [availableServices, setAvailableServices] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [metricHistory, setMetricHistory] = useState([]);
  const [statistics, setStatistics] = useState({
    current: 0,
    min: 0,
    max: 0,
    avg: 0,
    count: 0
  });
  
  useEffect(() => {
    // Extract available services from metrics data
    const services = [...new Set(metricsData.metrics.map(m => m.service))];
    setAvailableServices(services);
    
    // Set default selected service if none is selected yet
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [metricsData, selectedService]);
  
  useEffect(() => {
    if (selectedService) {
      // Extract available metrics for the selected service
      const metrics = [...new Set(
        metricsData.metrics
          .filter(m => m.service === selectedService)
          .map(m => m.metric)
      )];
      
      setAvailableMetrics(metrics);
      
      // Set default selected metric if none is selected yet
      if (metrics.length > 0 && !selectedMetric) {
        setSelectedMetric(metrics[0]);
      }
    }
  }, [selectedService, metricsData, selectedMetric]);
  
  useEffect(() => {
    if (selectedService && selectedMetric) {
      // Find the metric data
      const metricData = metricsData.metrics.find(
        m => m.service === selectedService && m.metric === selectedMetric
      );
      
      if (metricData && metricData.history) {
        // Format data for chart
        const formattedHistory = metricData.history.map(point => ({
          time: format(new Date(point.timestamp), 'HH:mm:ss'),
          value: point.value,
          timestamp: point.timestamp
        }));
        
        setMetricHistory(formattedHistory);
        
        // Calculate statistics
        if (formattedHistory.length > 0) {
          const values = formattedHistory.map(point => point.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          
          setStatistics({
            current: formattedHistory[formattedHistory.length - 1].value,
            min,
            max,
            avg,
            count: values.length
          });
        }
      } else {
        setMetricHistory([]);
        setStatistics({
          current: 0,
          min: 0,
          max: 0,
          avg: 0,
          count: 0
        });
      }
    }
  }, [selectedService, selectedMetric, metricsData]);
  
  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
    setSelectedMetric('');
  };
  
  const handleMetricChange = (e) => {
    setSelectedMetric(e.target.value);
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
  
  // Get unit label based on metric type
  const getMetricUnit = (metricName) => {
    switch(metricName) {
      case 'cpu_usage':
      case 'memory_usage':
        return '%';
      case 'response_time':
        return 'ms';
      default:
        return '';
    }
  };
  
  return (
    <div className="metric-details">
      <h2>Metric Details</h2>
      
      <div className="controls">
        <div className="form-group">
          <label htmlFor="service-select">Service:</label>
          <select 
            id="service-select" 
            className="form-control"
            value={selectedService}
            onChange={handleServiceChange}
          >
            <option value="">Select Service</option>
            {availableServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="metric-select">Metric:</label>
          <select 
            id="metric-select" 
            className="form-control"
            value={selectedMetric}
            onChange={handleMetricChange}
            disabled={!selectedService}
          >
            <option value="">Select Metric</option>
            {availableMetrics.map(metric => (
              <option key={metric} value={metric}>{metric.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      
      {selectedService && selectedMetric ? (
        <>
          <div className="statistics-cards">
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-title">Current Value</span>
                </div>
                <div className="dashboard-card-value">
                  {statistics.current.toFixed(2)}{getMetricUnit(selectedMetric)}
                </div>
              </div>
              
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-title">Minimum</span>
                </div>
                <div className="dashboard-card-value">
                  {statistics.min.toFixed(2)}{getMetricUnit(selectedMetric)}
                </div>
              </div>
              
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-title">Maximum</span>
                </div>
                <div className="dashboard-card-value">
                  {statistics.max.toFixed(2)}{getMetricUnit(selectedMetric)}
                </div>
              </div>
              
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-title">Average</span>
                </div>
                <div className="dashboard-card-value">
                  {statistics.avg.toFixed(2)}{getMetricUnit(selectedMetric)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="chart-section">
            <h3>{selectedService} - {selectedMetric.replace('_', ' ')} History</h3>
            
            {metricHistory.length === 0 ? (
              <p>No history data available for this metric.</p>
            ) : (
              <div className="detailed-chart">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metricHistory} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis 
                      domain={['auto', 'auto']}
                      label={{ 
                        value: `${selectedMetric.replace('_', ' ')} ${getMetricUnit(selectedMetric)}`, 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <Tooltip 
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value) => [
                        `${value.toFixed(2)}${getMetricUnit(selectedMetric)}`,
                        selectedMetric.replace('_', ' ')
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name={selectedMetric.replace('_', ' ')}
                      stroke={getMetricColor(selectedMetric)} 
                      activeDot={{ r: 8 }}
                    />
                    <Brush dataKey="time" height={30} stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Recent data points */}
          <div className="data-table-section">
            <h3>Recent Data Points</h3>
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {metricHistory.slice(-10).reverse().map((point, index) => (
                  <tr key={index}>
                    <td>{point.time}</td>
                    <td>{point.value.toFixed(2)}{getMetricUnit(selectedMetric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="placeholder">
          <p>Select a service and metric to view details.</p>
        </div>
      )}
    </div>
  );
};

export default MetricDetails;
