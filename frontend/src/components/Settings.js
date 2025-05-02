import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    websocketUrl: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080/ws',
    refreshInterval: 10,
    darkMode: false,
    alertsEnabled: true,
    alertSound: true,
    anomalyThreshold: 2.0,
    dataRetentionDays: 7,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    // Load settings from localStorage on component mount
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, []);
  
  useEffect(() => {
    // Check if settings have changed from the original loaded settings
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
      try {
        const originalSettings = JSON.parse(savedSettings);
        setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
      } catch (error) {
        setHasChanges(true);
      }
    } else {
      setHasChanges(true);
    }
  }, [settings]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) : 
              value
    });
    
    // Reset saved status
    setIsSaved(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Save to localStorage
      localStorage.setItem('dashboardSettings', JSON.stringify(settings));
      
      setIsLoading(false);
      setIsSaved(true);
      setHasChanges(false);
      
      // Apply certain settings immediately
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      
      // Hide saved message after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    }, 500);
  };
  
  const resetToDefaults = () => {
    const defaultSettings = {
      websocketUrl: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080/ws',
      refreshInterval: 10,
      darkMode: false,
      alertsEnabled: true,
      alertSound: true,
      anomalyThreshold: 2.0,
      dataRetentionDays: 7,
    };
    
    setSettings(defaultSettings);
    setIsSaved(false);
    setHasChanges(true);
  };
  
  return (
    <div className="settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Configure your dashboard preferences and connection settings.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Connection Settings */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Settings</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="websocketUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  WebSocket URL:
                </label>
                <input
                  type="text"
                  id="websocketUrl"
                  name="websocketUrl"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={settings.websocketUrl}
                  onChange={handleInputChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The WebSocket endpoint for real-time updates. Requires restart to take effect.
                </p>
              </div>
              
              <div>
                <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-1">
                  Refresh Interval (seconds):
                </label>
                <input
                  type="number"
                  id="refreshInterval"
                  name="refreshInterval"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="1"
                  max="60"
                  value={settings.refreshInterval}
                  onChange={handleInputChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  How often the dashboard should poll for updates when WebSocket is unavailable.
                </p>
              </div>
            </div>
          </div>
          
          {/* Display Settings */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="darkMode"
                    name="darkMode"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={settings.darkMode}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="darkMode" className="font-medium text-gray-700">Dark Mode</label>
                  <p className="text-gray-500">Enable dark mode for the dashboard.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alert Settings */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Alert Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="alertsEnabled"
                    name="alertsEnabled"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={settings.alertsEnabled}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="alertsEnabled" className="font-medium text-gray-700">Enable Alerts</label>
                  <p className="text-gray-500">Show alert notifications when anomalies are detected.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="alertSound"
                    name="alertSound"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={settings.alertSound}
                    onChange={handleInputChange}
                    disabled={!settings.alertsEnabled}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="alertSound" className={`font-medium ${settings.alertsEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
                    Play Alert Sound
                  </label>
                  <p className={settings.alertsEnabled ? 'text-gray-500' : 'text-gray-400'}>
                    Play a sound when an alert is triggered.
                  </p>
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="anomalyThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                  Anomaly Threshold:
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    id="anomalyThreshold"
                    name="anomalyThreshold"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="1"
                    max="10"
                    step="0.1"
                    value={settings.anomalyThreshold}
                    onChange={handleInputChange}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Standard deviations from mean to trigger anomaly detection (lower is more sensitive).
                </p>
              </div>
            </div>
          </div>
          
          {/* Data Settings */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Data Settings</h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="dataRetentionDays" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention (days):
                </label>
                <input
                  type="number"
                  id="dataRetentionDays"
                  name="dataRetentionDays"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="1"
                  max="90"
                  value={settings.dataRetentionDays}
                  onChange={handleInputChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  How long to keep historical data in the dashboard.
                </p>
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div>
              {isSaved && (
                <div className="flex items-center text-green-600">
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Settings saved successfully!</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button 
                type="button" 
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={resetToDefaults}
              >
                Reset to Defaults
              </button>
              
              <button 
                type="submit" 
                className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 ${hasChanges ? 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' : 'opacity-50 cursor-not-allowed'}`}
                disabled={isLoading || !hasChanges}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* About Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About</h2>
        <div className="flex items-center mb-4">
          <svg className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="none">
            <path d="M9 12H15M12 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">Streaming Analytics Dashboard</h3>
            <p className="text-sm text-gray-500">v1.0.0</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          A real-time monitoring and analytics dashboard for streaming data pipelines.
        </p>
        
        <p className="text-sm text-gray-500">
          &copy; 2025 Your Company. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Settings;