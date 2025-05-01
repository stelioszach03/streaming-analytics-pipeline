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
  };
  
  return (
    <div className="settings">
      <h2>Dashboard Settings</h2>
      
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Connection Settings</h3>
          
          <div className="form-group">
            <label htmlFor="websocketUrl">WebSocket URL:</label>
            <input
              type="text"
              id="websocketUrl"
              name="websocketUrl"
              className="form-control"
              value={settings.websocketUrl}
              onChange={handleInputChange}
            />
            <small className="form-text text-muted">
              The WebSocket endpoint for real-time updates. Requires restart to take effect.
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="refreshInterval">Refresh Interval (seconds):</label>
            <input
              type="number"
              id="refreshInterval"
              name="refreshInterval"
              className="form-control"
              min="1"
              max="60"
              value={settings.refreshInterval}
              onChange={handleInputChange}
            />
            <small className="form-text text-muted">
              How often the dashboard should poll for updates when WebSocket is unavailable.
            </small>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Display Settings</h3>
          
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="darkMode"
              name="darkMode"
              checked={settings.darkMode}
              onChange={handleInputChange}
            />
            <label htmlFor="darkMode">Dark Mode</label>
            <small className="form-text text-muted">
              Enable dark mode for the dashboard.
            </small>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Alert Settings</h3>
          
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="alertsEnabled"
              name="alertsEnabled"
              checked={settings.alertsEnabled}
              onChange={handleInputChange}
            />
            <label htmlFor="alertsEnabled">Enable Alerts</label>
            <small className="form-text text-muted">
              Show alert notifications when anomalies are detected.
            </small>
          </div>
          
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="alertSound"
              name="alertSound"
              checked={settings.alertSound}
              onChange={handleInputChange}
              disabled={!settings.alertsEnabled}
            />
            <label htmlFor="alertSound">Play Alert Sound</label>
            <small className="form-text text-muted">
              Play a sound when an alert is triggered.
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="anomalyThreshold">Anomaly Threshold:</label>
            <input
              type="number"
              id="anomalyThreshold"
              name="anomalyThreshold"
              className="form-control"
              min="1"
              max="10"
              step="0.1"
              value={settings.anomalyThreshold}
              onChange={handleInputChange}
            />
            <small className="form-text text-muted">
              Standard deviations from mean to trigger anomaly detection (lower is more sensitive).
            </small>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Data Settings</h3>
          
          <div className="form-group">
            <label htmlFor="dataRetentionDays">Data Retention (days):</label>
            <input
              type="number"
              id="dataRetentionDays"
              name="dataRetentionDays"
              className="form-control"
              min="1"
              max="90"
              value={settings.dataRetentionDays}
              onChange={handleInputChange}
            />
            <small className="form-text text-muted">
              How long to keep historical data in the dashboard.
            </small>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-danger"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </button>
          
          {isSaved && (
            <div className="save-confirmation">
              Settings saved successfully!
            </div>
          )}
        </div>
      </form>
      
      <div className="about-section">
        <h3>About</h3>
        <p>Streaming Analytics Dashboard v1.0.0</p>
        <p>A real-time monitoring and analytics dashboard for streaming data pipelines.</p>
        <p>&copy; 2025 Your Company. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Settings;
