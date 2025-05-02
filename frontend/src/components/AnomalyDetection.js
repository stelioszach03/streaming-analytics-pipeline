import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
      const severities = [...new Set(anomalies.map(a => a.severity || 'high'))]; // Default to 'high' if not specified
      
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
      severity: anomaly.severity || 'high', // Default to 'high' if not specified
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
        filters.severity === '' || (anomaly.severity || 'high') === filters.severity
      ),
    };
  }).filter(group => group.anomalies.length > 0);
  
  // Get color based on metric type
  const getMetricColor = (metricName) => {
    switch(metricName) {
      case 'cpu_usage':
        return '#3b82f6'; // blue-500
      case 'memory_usage':
        return '#10b981'; // emerald-500
      case 'response_time':
        return '#f59e0b'; // amber-500
      case 'error_count':
        return '#ef4444'; // red-500
      case 'request_count':
        return '#8b5cf6'; // violet-500
      default:
        return '#6b7280'; // gray-500
    }
  };
  
  // Get severity badge class
  const getSeverityBadgeClass = (severity) => {
    switch(severity || 'high') {
      case 'high':
        return 'status-critical';
      case 'medium':
        return 'status-warning';
      case 'low':
        return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium';
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium';
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Anomaly Detection</h1>
        <p className="mt-2 text-sm text-gray-600">Monitor and investigate service anomalies detected by the system.</p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:space-x-4">
          <div className="mb-4 sm:mb-0 flex-grow">
            <label htmlFor="service-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Service:
            </label>
            <select 
              id="service-filter" 
              name="service"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.service}
              onChange={handleFilterChange}
            >
              <option value="">All Services</option>
              {availableFilters.services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4 sm:mb-0 flex-grow">
            <label htmlFor="metric-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Metric:
            </label>
            <select 
              id="metric-filter" 
              name="metric"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.metric}
              onChange={handleFilterChange}
            >
              <option value="">All Metrics</option>
              {availableFilters.metrics.map(metric => (
                <option key={metric} value={metric}>{metric.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4 sm:mb-0 flex-grow">
            <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Severity:
            </label>
            <select 
              id="severity-filter" 
              name="severity"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.severity}
              onChange={handleFilterChange}
            >
              <option value="">All Severities</option>
              {availableFilters.severities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      {anomalies.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-gray-500">No anomalies detected yet.</p>
        </div>
      ) : filteredAnomalyGroups.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">No anomalies match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 bg-gray-50 rounded-md p-3 shadow-inner">
            <p className="text-sm text-gray-600">
              Showing {filteredAnomalyGroups.reduce((sum, group) => sum + group.anomalies.length, 0)} anomalies across {filteredAnomalyGroups.length} service-metric combinations
            </p>
          </div>
          
          {filteredAnomalyGroups.map(group => (
            <div key={`${group.service}-${group.metric}`} className="metric-card mb-6">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">{group.service} - {group.metric.replace('_', ' ')}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                  {group.anomalies.length} anomalies
                </span>
              </div>
              
              <div className="p-4">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={formatChartData(group.anomalies)} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }} 
                        stroke="#9ca3af"
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        stroke="#9ca3af"
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        labelStyle={{ 
                          color: '#111827', 
                          fontWeight: '500', 
                          marginBottom: '0.25rem' 
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value, name) => [
                          `${value.toFixed(2)}${getMetricUnit(group.metric)}`,
                          name === 'expected' ? 'Expected Value' : 'Actual Value'
                        ]}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: 20, 
                          fontSize: 12 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name="Actual Value"
                        stroke={getMetricColor(group.metric)} 
                        strokeWidth={2}
                        dot={{ 
                          r: 5, 
                          strokeWidth: 1, 
                          fill: "#fff",
                          stroke: d => {
                            const severity = d.severity || 'high';
                            return severity === 'high' ? '#ef4444' : 
                                   severity === 'medium' ? '#f59e0b' : '#3b82f6';
                          }
                        }}
                        activeDot={{ r: 7, strokeWidth: 1 }}
                      />
                      {group.anomalies.some(a => a.expected_value) && (
                        <Line 
                          type="monotone" 
                          dataKey="expected" 
                          name="Expected Value"
                          stroke="#9ca3af" 
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="border-t border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deviation</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.anomalies.map((anomaly, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(anomaly.timestamp)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {anomaly.value.toFixed(2)}{getMetricUnit(group.metric)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {anomaly.expected_value ? `${anomaly.expected_value.toFixed(2)}${getMetricUnit(group.metric)}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {anomaly.deviation ? `${(anomaly.deviation * 100).toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getSeverityBadgeClass(anomaly.severity)}>
                              {anomaly.severity || 'high'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default AnomalyDetection;