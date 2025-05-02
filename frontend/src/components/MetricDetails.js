import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend, ReferenceLine } from 'recharts';
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
  
  // Get thresholds based on metric type
  const getMetricThresholds = (metricName) => {
    switch(metricName) {
      case 'cpu_usage':
        return { warning: 70, critical: 90 };
      case 'memory_usage':
        return { warning: 70, critical: 90 };
      case 'response_time':
        return { warning: 200, critical: 500 };
      case 'error_count':
        return { warning: 5, critical: 10 };
      default:
        return { warning: null, critical: null };
    }
  };

  return (
    <div className="metric-details">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Metric Details</h1>
        <p className="mt-2 text-sm text-gray-600">Analyze detailed metrics and historical data for your services.</p>
      </div>
      
      {/* Service and Metric Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
              Service:
            </label>
            <select 
              id="service-select" 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={selectedService}
              onChange={handleServiceChange}
            >
              <option value="">Select Service</option>
              {availableServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="metric-select" className="block text-sm font-medium text-gray-700 mb-1">
              Metric:
            </label>
            <select 
              id="metric-select" 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
      </div>
      
      {selectedService && selectedMetric ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="metric-card p-4">
              <div className="text-sm font-medium text-gray-500">Current Value</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {statistics.current.toFixed(2)}{getMetricUnit(selectedMetric)}
              </div>
            </div>
            
            <div className="metric-card p-4">
              <div className="text-sm font-medium text-gray-500">Minimum</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {statistics.min.toFixed(2)}{getMetricUnit(selectedMetric)}
              </div>
            </div>
            
            <div className="metric-card p-4">
              <div className="text-sm font-medium text-gray-500">Maximum</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {statistics.max.toFixed(2)}{getMetricUnit(selectedMetric)}
              </div>
            </div>
            
            <div className="metric-card p-4">
              <div className="text-sm font-medium text-gray-500">Average</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {statistics.avg.toFixed(2)}{getMetricUnit(selectedMetric)}
              </div>
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="metric-card mb-6">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedService} - {selectedMetric.replace('_', ' ')} History
              </h2>
            </div>
            
            {metricHistory.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No history data available for this metric.</p>
              </div>
            ) : (
              <div className="p-4">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={metricHistory} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }} 
                        stroke="#9ca3af"
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 12 }} 
                        stroke="#9ca3af"
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: `${selectedMetric.replace('_', ' ')} ${getMetricUnit(selectedMetric)}`, 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: '#6b7280', fontSize: 12 }
                        }}
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
                        formatter={(value) => [
                          `${value.toFixed(2)}${getMetricUnit(selectedMetric)}`,
                          selectedMetric.replace('_', ' ')
                        ]}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: 20, 
                          fontSize: 12 
                        }} 
                      />
                      
                      {/* Reference lines for thresholds if applicable */}
                      {getMetricThresholds(selectedMetric).warning && (
                        <ReferenceLine 
                          y={getMetricThresholds(selectedMetric).warning} 
                          label={{ 
                            value: "Warning", 
                            position: "right",
                            fill: "#f59e0b",
                            fontSize: 12
                          }} 
                          stroke="#f59e0b" 
                          strokeDasharray="3 3" 
                        />
                      )}
                      
                      {getMetricThresholds(selectedMetric).critical && (
                        <ReferenceLine 
                          y={getMetricThresholds(selectedMetric).critical} 
                          label={{ 
                            value: "Critical", 
                            position: "right",
                            fill: "#ef4444",
                            fontSize: 12
                          }} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                        />
                      )}
                      
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name={selectedMetric.replace('_', ' ')}
                        stroke={getMetricColor(selectedMetric)} 
                        strokeWidth={2}
                        activeDot={{ r: 5, strokeWidth: 1 }}
                      />
                      <Brush 
                        dataKey="time" 
                        height={30} 
                        stroke={getMetricColor(selectedMetric)}
                        y={320}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          
          {/* Recent Data Points */}
          <div className="metric-card">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">Recent Data Points</h2>
            </div>
            
            {metricHistory.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No data points available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metricHistory.slice(-10).reverse().map((point, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{point.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{point.value.toFixed(2)}{getMetricUnit(selectedMetric)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="mt-4 text-gray-500">Select a service and metric to view details.</p>
        </div>
      )}
    </div>
  );
};

export default MetricDetails;