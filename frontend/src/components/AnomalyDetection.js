import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { format } from 'date-fns';

const AnomalyDetection = ({ anomalies }) => {
  const [groupedAnomalies, setGroupedAnomalies] = useState({});
  const [filters, setFilters] = useState({
    service: '',
    metric: '',
    severity: '',
  });
  const [availableFilters, setAvailableFilters] = useState({
    services: [],
    metrics: [],
    severities: [],
  });
  
  useEffect(() => {
    if (anomalies && anomalies.length > 0) {
      // Extract available filter options
      const services = [...new Set(anomalies.map(a => a.service))];
      const metrics = [...new Set(anomalies.map(a => a.metric))];
      const severities = [...new Set(anomalies.map(a => a.severity))];
      
      setAvailableFilters({
        services,
        metrics,
        severities,
      });
      
      // Group anomalies by service and metric
      const grouped = anomalies.reduce((acc, anomaly) => {
        const key = `${anomaly.service}-${anomaly.metric}`;
        
        if (!acc[key]) {
          acc[key] = {
            service: anomaly.service,
            metric: anomaly.metric,
            anomalies: [],
          };
        }
        
        acc[key].anomalies.push(anomaly);
        return acc;
      }, {});
      
      setGroupedAnomalies(grouped);
    }
  }, [anomalies]);
  
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };
  
  const clearFilters = () => {
    setFilters({
      service: '',
      metric: '',
      severity: '',
    });
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
  };
  
  // Format data for chart
  const formatChartData = (anomalies) => {
    if (!anomalies || anomalies.length === 0) return [];
    
    // Sort by timestamp
    const sorted = [...anomalies].sort((a, b) => a.timestamp - b.timestamp);
    
    return sorted.map(anomaly => ({
      time: format(new Date(anomaly.timestamp), 'HH:mm:ss'),
      value: anomaly.value,
      expected: anomaly.expected_value,
      timestamp: anomaly.timestamp,
      severity: anomaly.severity,
    }));
  };
  
  // Filter anomalies
  const filteredAnomalyGroups = Object.values(groupedAnomalies).filter(group => {
    return (
      (filters.service === '' || group.service === filters.service) &&
      (filters.metric === '' || group.metric === filters.metric)
    );
  }).map(group => {
    return {
      ...group,
      anomalies: group.anomalies.filter(anomaly => 
        filters.severity === '' || anomaly.severity === filters.severity
      ),
    };
  }).filter(group => group.anomalies.length > 0);
  
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
  
  // Get severity color
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high':
        return '#e74c3c';
      case 'medium':
        return '#f39c12';
      case 'low':
        return '#3498db';
      default:
        return '#7f8c8d';
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
    <div className="anomaly-detection">
      <h2>Anomaly Detection</h2>
      
      <div className="filters-section">
        <div className="controls">
          <div className="form-group">
            <label htmlFor="service-filter">Service:</label>
            <select 
              id="service-filter" 
              name="service"
              className="form-control"
              value={filters.service}
              onChange={handleFilterChange}
            >
              <option value="">All Services</option>
              {availableFilters.services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="metric-filter">Metric:</label>
            <select 
              id="metric-filter" 
              name="metric"
              className="form-control"
              value={filters.metric}
              onChange={handleFilterChange}
            >
              <option value="">All Metrics</option>
              {availableFilters.metrics.map(metric => (
                <option key={metric} value={metric}>{metric.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="severity-filter">Severity:</label>
            <select 
              id="severity-filter" 
              name="severity"
              className="form-control"
              value={filters.severity}
              onChange={handleFilterChange}
            >
              <option value="">All Severities</option>
              {availableFilters.severities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>
      </div>
      
      {anomalies.length === 0 ? (
        <div className="empty-state">
          <p>No anomalies detected yet.</p>
        </div>
      ) : filteredAnomalyGroups.length === 0 ? (
        <div className="empty-state">
          <p>No anomalies match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="anomaly-count">
            <p>Showing {filteredAnomalyGroups.reduce((sum, group) => sum + group.anomalies.length, 0)} anomalies</p>
          </div>
          
          {filteredAnomalyGroups.map(group => (
            <div key={`${group.service}-${group.metric}`} className="anomaly-group">
              <h3>{group.service} - {group.metric.replace('_', ' ')}</h3>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatChartData(group.anomalies)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value, name) => [
                        `${value.toFixed(2)}${getMetricUnit(group.metric)}`,
                        name === 'expected' ? 'Expected Value' : 'Actual Value'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name="Actual Value"
                      stroke={getMetricColor(group.metric)} 
                      dot={{ 
                        fill: d => getSeverityColor(d.severity),
                        r: 6
                      }}
                      activeDot={{ r: 8 }}
                    />
                    {group.anomalies.some(a => a.expected_value) && (
                      <Line 
                        type="monotone" 
                        dataKey="expected" 
                        name="Expected Value"
                        stroke="#7f8c8d" 
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="anomaly-table">
                <table className="metrics-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Value</th>
                      <th>Expected</th>
                      <th>Deviation</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.anomalies.map((anomaly, index) => (
                      <tr key={index}>
                        <td>{formatTimestamp(anomaly.timestamp)}</td>
                        <td>{anomaly.value.toFixed(2)}{getMetricUnit(group.metric)}</td>
                        <td>{anomaly.expected_value ? `${anomaly.expected_value.toFixed(2)}${getMetricUnit(group.metric)}` : 'N/A'}</td>
                        <td>{anomaly.deviation ? `${(anomaly.deviation * 100).toFixed(1)}%` : 'N/A'}</td>
                        <td>
                          <span className={`anomaly-badge ${anomaly.severity}`}>
                            {anomaly.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default AnomalyDetection;
