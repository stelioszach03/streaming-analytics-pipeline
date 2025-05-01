import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, 
  BarChart, Bar, Cell, RadarChart, Radar, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { format } from 'date-fns';

const ServiceHealth = ({ serviceHealth }) => {
  const [selectedService, setSelectedService] = useState('');
  const [healthHistory, setHealthHistory] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  
  useEffect(() => {
    // Transform serviceHealth object into array
    const services = Object.entries(serviceHealth).map(([name, data]) => ({
      name,
      ...data
    }));
    
    setServicesData(services);
    
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].name);
    }
  }, [serviceHealth, selectedService]);
  
  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'healthy':
        return '#2ecc71';
      case 'warning':
        return '#f39c12';
      case 'critical':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };
  
  // Prepare data for radar chart
  const prepareRadarData = (service) => {
    if (!service) return [];
    
    return [
      { 
        metric: 'Response Time', 
        value: Math.min(100, service.avg_response_time / 10), // Scale for presentation
        fullMark: 100 
      },
      { 
        metric: 'CPU Usage', 
        value: service.avg_cpu_usage,
        fullMark: 100 
      },
      { 
        metric: 'Memory Usage', 
        value: service.avg_memory_usage,
        fullMark: 100 
      },
      { 
        metric: 'Error Rate', 
        value: Math.min(100, (service.anomalies_count / service.metrics_count) * 100),
        fullMark: 100 
      },
      { 
        metric: 'Uptime', 
        value: 100 - Math.min(100, (service.anomalies_count / service.metrics_count) * 100),
        fullMark: 100 
      }
    ];
  };
  
  // Get the selected service data
  const selectedServiceData = servicesData.find(service => service.name === selectedService);
  
  return (
    <div className="service-health">
      <h2>Service Health</h2>
      
      {servicesData.length === 0 ? (
        <div className="empty-state">
          <p>No service health data available.</p>
        </div>
      ) : (
        <>
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
                {servicesData.map(service => (
                  <option key={service.name} value={service.name}>{service.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Overview Cards */}
          <div className="dashboard-grid">
            {servicesData.map(service => (
              <div 
                key={service.name} 
                className={`dashboard-card ${service.name === selectedService ? 'selected' : ''}`}
                onClick={() => setSelectedService(service.name)}
              >
                <div className="dashboard-card-header">
                  <span className="dashboard-card-title">{service.name}</span>
                  <span className={`health-status ${service.status.toLowerCase()}`}>
                    {service.status}
                  </span>
                </div>
                <div className="health-stats">
                  <div className="health-stat">
                    <span className="health-stat-label">Response Time</span>
                    <span className="health-stat-value">{service.avg_response_time.toFixed(2)}ms</span>
                  </div>
                  <div className="health-stat">
                    <span className="health-stat-label">CPU Usage</span>
                    <span className="health-stat-value">{service.avg_cpu_usage.toFixed(2)}%</span>
                  </div>
                  <div className="health-stat">
                    <span className="health-stat-label">Memory Usage</span>
                    <span className="health-stat-value">{service.avg_memory_usage.toFixed(2)}%</span>
                  </div>
                  <div className="health-stat">
                    <span className="health-stat-label">Anomalies</span>
                    <span className="health-stat-value">{service.anomalies_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedServiceData && (
            <div className="service-detail">
              <h3>{selectedServiceData.name} Detailed Health</h3>
              
              <div className="dashboard-grid">
                {/* CPU & Memory Chart */}
                <div className="dashboard-card wide">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-title">Resource Usage</span>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: 'CPU', value: selectedServiceData.avg_cpu_usage },
                          { name: 'Memory', value: selectedServiceData.avg_memory_usage }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} label={{ value: '%', position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Usage']} />
                        <Legend />
                        <Bar dataKey="value" name="Usage Percentage">
                          {[
                            <Cell key="cpu" fill="#3498db" />,
                            <Cell key="memory" fill="#2ecc71" />
                          ]}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Radar Chart */}
                <div className="dashboard-card wide">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-title">Performance Metrics</span>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart 
                        cx="50%" 
                        cy="50%" 
                        outerRadius="80%" 
                        data={prepareRadarData(selectedServiceData)}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar 
                          name="Values" 
                          dataKey="value" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                        <Tooltip formatter={(value) => [`${value.toFixed(2)}`, 'Score']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Health Status Details */}
              <div className="health-details">
                <h4>Health Status Details</h4>
                <table className="metrics-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Response Time</td>
                      <td>{selectedServiceData.avg_response_time.toFixed(2)}ms</td>
                      <td>
                        <span className={`health-status ${selectedServiceData.avg_response_time > 500 ? 'critical' : selectedServiceData.avg_response_time > 200 ? 'warning' : 'healthy'}`}>
                          {selectedServiceData.avg_response_time > 500 ? 'Critical' : selectedServiceData.avg_response_time > 200 ? 'Warning' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>CPU Usage</td>
                      <td>{selectedServiceData.avg_cpu_usage.toFixed(2)}%</td>
                      <td>
                        <span className={`health-status ${selectedServiceData.avg_cpu_usage > 80 ? 'critical' : selectedServiceData.avg_cpu_usage > 60 ? 'warning' : 'healthy'}`}>
                          {selectedServiceData.avg_cpu_usage > 80 ? 'Critical' : selectedServiceData.avg_cpu_usage > 60 ? 'Warning' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Memory Usage</td>
                      <td>{selectedServiceData.avg_memory_usage.toFixed(2)}%</td>
                      <td>
                        <span className={`health-status ${selectedServiceData.avg_memory_usage > 80 ? 'critical' : selectedServiceData.avg_memory_usage > 60 ? 'warning' : 'healthy'}`}>
                          {selectedServiceData.avg_memory_usage > 80 ? 'Critical' : selectedServiceData.avg_memory_usage > 60 ? 'Warning' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Anomaly Rate</td>
                      <td>{((selectedServiceData.anomalies_count / Math.max(1, selectedServiceData.metrics_count)) * 100).toFixed(2)}%</td>
                      <td>
                        <span className={`health-status ${selectedServiceData.anomalies_count > 10 ? 'critical' : selectedServiceData.anomalies_count > 5 ? 'warning' : 'healthy'}`}>
                          {selectedServiceData.anomalies_count > 10 ? 'Critical' : selectedServiceData.anomalies_count > 5 ? 'Warning' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Overall Health</td>
                      <td>{selectedServiceData.status}</td>
                      <td>
                        <span className={`health-status ${selectedServiceData.status.toLowerCase()}`}>
                          {selectedServiceData.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Recommendations */}
              <div className="recommendations">
                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {selectedServiceData.avg_response_time > 500 && (
                    <li>Investigate high response times. Check for database bottlenecks or external service dependencies.</li>
                  )}
                  {selectedServiceData.avg_cpu_usage > 80 && (
                    <li>High CPU usage detected. Consider scaling horizontally or optimizing code.</li>
                  )}
                  {selectedServiceData.avg_memory_usage > 80 && (
                    <li>High memory usage detected. Check for memory leaks or increase allocated memory.</li>
                  )}
                  {selectedServiceData.anomalies_count > 10 && (
                    <li>High number of anomalies detected. Review logs and consider implementing circuit breakers.</li>
                  )}
                  {selectedServiceData.avg_response_time <= 500 && 
                   selectedServiceData.avg_cpu_usage <= 80 && 
                   selectedServiceData.avg_memory_usage <= 80 && 
                   selectedServiceData.anomalies_count <= 10 && (
                    <li>Service is operating within normal parameters. No immediate action required.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ServiceHealth;
