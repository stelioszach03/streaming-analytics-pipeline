import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, 
  RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

const ServiceHealth = ({ serviceHealth }) => {
  const [selectedService, setSelectedService] = useState('');
  const [servicesData, setServicesData] = useState([]);
  
  React.useEffect(() => {
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
  
  // Get health status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy':
        return '#10b981'; // emerald-500
      case 'warning':
        return '#f59e0b'; // amber-500
      case 'critical':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Get resource usage bar color
  const getResourceColor = (value) => {
    if (value > 80) return '#ef4444'; // red-500
    if (value > 60) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };
  
  // Format metric name
  const formatMetricName = (name) => {
    return name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
        value: Math.min(100, (service.anomalies_count / Math.max(1, service.metrics_count)) * 100),
        fullMark: 100 
      },
      { 
        metric: 'Uptime', 
        value: 100 - Math.min(100, (service.anomalies_count / Math.max(1, service.metrics_count)) * 100),
        fullMark: 100 
      }
    ];
  };
  
  // Prepare data for resource usage bar chart
  const prepareResourceData = (service) => {
    if (!service) return [];
    
    return [
      { name: 'CPU', value: service.avg_cpu_usage },
      { name: 'Memory', value: service.avg_memory_usage }
    ];
  };
  
  // Get the selected service data
  const selectedServiceData = servicesData.find(service => service.name === selectedService);
  
  // Get recommendations based on metrics
  const getRecommendations = (service) => {
    if (!service) return [];
    
    const recommendations = [];
    
    if (service.avg_response_time > 500) {
      recommendations.push('Investigate high response times. Check for database bottlenecks or external service dependencies.');
    }
    
    if (service.avg_cpu_usage > 80) {
      recommendations.push('High CPU usage detected. Consider scaling horizontally or optimizing code.');
    }
    
    if (service.avg_memory_usage > 80) {
      recommendations.push('High memory usage detected. Check for memory leaks or increase allocated memory.');
    }
    
    if (service.anomalies_count > 10) {
      recommendations.push('High number of anomalies detected. Review logs and consider implementing circuit breakers.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Service is operating within normal parameters. No immediate action required.');
    }
    
    return recommendations;
  };
  
  return (
    <div className="service-health">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Health</h1>
        <p className="mt-2 text-sm text-gray-600">Monitor the health and performance of your services.</p>
      </div>
      
      {servicesData.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="mt-4 text-gray-500">No service health data available.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {servicesData.map(service => (
                <div 
                  key={service.name} 
                  className={`metric-card hover:border-blue-500 cursor-pointer transition-colors duration-150 ${service.name === selectedService ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}
                  onClick={() => setSelectedService(service.name)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
                      <span className={getHealthStatusClass(service.status)}>
                        {service.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">CPU</span>
                        <p className="mt-1 font-medium">{service.avg_cpu_usage?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Memory</span>
                        <p className="mt-1 font-medium">{service.avg_memory_usage?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Response</span>
                        <p className="mt-1 font-medium">{service.avg_response_time?.toFixed(0)}ms</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Anomalies</span>
                        <p className="mt-1 font-medium">{service.anomalies_count}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedServiceData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedServiceData.name} Detailed Health
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resource Usage Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Resource Usage</h3>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareResourceData(selectedServiceData)}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis type="number" domain={[0, 100]} tickCount={6} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value) => [`${value.toFixed(2)}%`, 'Usage']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.375rem',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                          />
                          <Bar dataKey="value" name="Usage Percentage" radius={[0, 4, 4, 0]}>
                            {prepareResourceData(selectedServiceData).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getResourceColor(entry.value)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Performance Metrics Radar */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Performance Metrics</h3>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="70%"
                          data={prepareRadarData(selectedServiceData)}
                        >
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar
                            name="Values"
                            dataKey="value"
                            stroke={getStatusColor(selectedServiceData.status)}
                            fill={getStatusColor(selectedServiceData.status)}
                            fillOpacity={0.2}
                          />
                          <Tooltip 
                            formatter={(value) => [`${value.toFixed(2)}`, 'Score']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.375rem',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Health Status Details */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Health Status Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Response Time</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedServiceData.avg_response_time.toFixed(2)}ms</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${selectedServiceData.avg_response_time > 500 ? 'status-critical' : selectedServiceData.avg_response_time > 200 ? 'status-warning' : 'status-healthy'}`}>
                              {selectedServiceData.avg_response_time > 500 ? 'Critical' : selectedServiceData.avg_response_time > 200 ? 'Warning' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">CPU Usage</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedServiceData.avg_cpu_usage.toFixed(2)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${selectedServiceData.avg_cpu_usage > 80 ? 'status-critical' : selectedServiceData.avg_cpu_usage > 60 ? 'status-warning' : 'status-healthy'}`}>
                              {selectedServiceData.avg_cpu_usage > 80 ? 'Critical' : selectedServiceData.avg_cpu_usage > 60 ? 'Warning' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Memory Usage</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedServiceData.avg_memory_usage.toFixed(2)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${selectedServiceData.avg_memory_usage > 80 ? 'status-critical' : selectedServiceData.avg_memory_usage > 60 ? 'status-warning' : 'status-healthy'}`}>
                              {selectedServiceData.avg_memory_usage > 80 ? 'Critical' : selectedServiceData.avg_memory_usage > 60 ? 'Warning' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Anomaly Rate</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {((selectedServiceData.anomalies_count / Math.max(1, selectedServiceData.metrics_count)) * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${selectedServiceData.anomalies_count > 10 ? 'status-critical' : selectedServiceData.anomalies_count > 5 ? 'status-warning' : 'status-healthy'}`}>
                              {selectedServiceData.anomalies_count > 10 ? 'Critical' : selectedServiceData.anomalies_count > 5 ? 'Warning' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Overall Health</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedServiceData.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getHealthStatusClass(selectedServiceData.status)}>
                              {selectedServiceData.status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Recommendations */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Recommendations</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {getRecommendations(selectedServiceData).map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ServiceHealth;