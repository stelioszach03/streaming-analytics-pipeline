import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  
  // Get icon based on metric type
  const getMetricIcon = (metricName) => {
    switch(metricName) {
      case 'cpu_usage':
        return (
          <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'memory_usage':
        return (
          <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'response_time':
        return (
          <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error_count':
        return (
          <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'request_count':
        return (
          <svg className="h-5 w-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  // Get health status badge class
  const getHealthStatusClass = (status) => {
    switch(status) {
      case 'healthy':
        return 'status-healthy';
      case 'warning':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium';
    }
  };
  
  return (
    <div className="dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Real-Time Analytics Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Monitor your services in real-time with comprehensive analytics and alerts.</p>
      </div>
      
      {/* Service Health Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Service Health Overview</h2>
        
        {Object.keys(metricsData.serviceHealth).length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
            <div className="animate-pulse flex justify-center my-2">
              <div className="h-3 w-3 bg-gray-200 rounded-full mx-1"></div>
              <div className="h-3 w-3 bg-gray-300 rounded-full mx-1"></div>
              <div className="h-3 w-3 bg-gray-200 rounded-full mx-1"></div>
            </div>
            <p className="text-gray-500">Waiting for service health data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metricsData.serviceHealth).map(([serviceName, health]) => (
              <div key={serviceName} className="metric-card">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 rounded-md bg-blue-50">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="truncate text-sm font-medium text-gray-500">{serviceName}</dt>
                        <dd>
                          <div className="flex items-center mt-1">
                            <span className={getHealthStatusClass(health.status)}>
                              {health.status}
                            </span>
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <div className="text-xs font-medium text-gray-500 truncate">CPU</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">{health.avg_cpu_usage?.toFixed(1)}%</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs font-medium text-gray-500 truncate">Memory</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">{health.avg_memory_usage?.toFixed(1)}%</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs font-medium text-gray-500 truncate">Resp Time</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">{health.avg_response_time?.toFixed(0)}ms</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs font-medium text-gray-500 truncate">Anomalies</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">{health.anomalies_count}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      {Object.keys(serviceMetrics).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <div className="animate-pulse flex justify-center my-2">
            <div className="h-3 w-3 bg-gray-200 rounded-full mx-1"></div>
            <div className="h-3 w-3 bg-gray-300 rounded-full mx-1"></div>
            <div className="h-3 w-3 bg-gray-200 rounded-full mx-1"></div>
          </div>
          <p className="text-gray-500">Waiting for metrics data...</p>
        </div>
      ) : (
        <div>
          {Object.entries(serviceMetrics).map(([serviceName, metrics]) => (
            <div key={serviceName} className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{serviceName} Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(metrics).map(([metricName, metricData]) => (
                  <div key={`${serviceName}-${metricName}`} className="metric-card">
                    <div className="metric-card-header">
                      <div className="flex items-center">
                        {getMetricIcon(metricName)}
                        <span className="ml-2 metric-card-title">{metricName.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTimestamp(metricData.timestamp)}</span>
                    </div>
                    <div className="metric-card-body">
                      <div className="metric-value">
                        {metricData.value.toFixed(2)}
                        {getMetricUnit(metricName)}
                      </div>
                      
                      <div className="chart-container mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={formatChartData(metricData.history)}
                            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10 }} 
                              stroke="#9ca3af"
                              tickLine={{ stroke: '#d1d5db' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 10 }} 
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
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={getMetricColor(metricName)} 
                              strokeWidth={2}
                              dot={false} 
                              activeDot={{ r: 5, strokeWidth: 1 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recent Anomalies */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Anomalies</h2>
        
        {topAnomalies.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">No anomalies detected yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topAnomalies.map((anomaly, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{anomaly.service}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{anomaly.metric.replace('_', ' ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {anomaly.value.toFixed(2)}{getMetricUnit(anomaly.metric)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {anomaly.expected_value ? `${anomaly.expected_value.toFixed(2)}${getMetricUnit(anomaly.metric)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(anomaly.timestamp)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${anomaly.severity === 'high' ? 'status-critical' : anomaly.severity === 'medium' ? 'status-warning' : 'status-healthy'}`}>
                          {anomaly.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;