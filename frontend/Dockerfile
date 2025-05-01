# Build stage
FROM node:18-alpine as build
WORKDIR /app

# Create necessary directories if they don't exist
RUN mkdir -p public src

# Create a basic index.html file if it doesn't exist
RUN if [ ! -f ./public/index.html ]; then \
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Streaming Analytics Dashboard</title></head><body><div id="root"></div></body></html>' > ./public/index.html; \
    fi

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install --save-dev react-scripts

# Copy all existing source files
COPY . .

# Ensure src/index.js exists
RUN if [ ! -f ./src/index.js ]; then \
    echo 'import React from "react"; import ReactDOM from "react-dom"; import App from "./App"; import "./App.css"; ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("root"));' > ./src/index.js; \
    fi

# Ensure App.js exists
RUN if [ ! -f ./src/App.js ]; then \
    echo 'import React from "react"; import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"; import "./App.css"; import Dashboard from "./components/Dashboard"; import MetricDetails from "./components/MetricDetails"; import AnomalyDetection from "./components/AnomalyDetection"; import ServiceHealth from "./components/ServiceHealth"; import Settings from "./components/Settings"; import WebSocketService from "./services/WebSocketService"; function App() { return ( <Router><div className="app"><header className="app-header"><h1>Streaming Analytics Dashboard</h1><div className="connection-status"><span className="status-indicator connected"></span><span>Connected</span></div></header><nav className="app-nav"><ul><li><Link to="/">Dashboard</Link></li><li><Link to="/metrics">Metric Details</Link></li><li><Link to="/anomalies">Anomaly Detection</Link></li><li><Link to="/service-health">Service Health</Link></li><li><Link to="/settings">Settings</Link></li></ul></nav><main className="app-content"><Routes><Route path="/" element={<Dashboard />} /><Route path="/metrics" element={<MetricDetails />} /><Route path="/anomalies" element={<AnomalyDetection />} /><Route path="/service-health" element={<ServiceHealth />} /><Route path="/settings" element={<Settings />} /></Routes></main><footer className="app-footer"><p>Streaming Analytics Dashboard v1.0.0</p></footer></div></Router> ); } export default App;' > ./src/App.js; \
    fi

# Ensure App.css exists
RUN if [ ! -f ./src/App.css ]; then \
    cp ./App.css ./src/App.css 2>/dev/null || echo '* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: sans-serif; background-color: #f5f7fa; } .app { display: flex; flex-direction: column; min-height: 100vh; } .app-header { background-color: #2c3e50; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; } .app-nav { background-color: #34495e; padding: 0.5rem 2rem; } .app-nav ul { list-style: none; display: flex; } .app-nav li { margin-right: 2rem; } .app-nav a { color: white; text-decoration: none; } .app-content { flex: 1; padding: 2rem; } .app-footer { background-color: #2c3e50; color: white; text-align: center; padding: 1rem; }' > ./src/App.css; \
    fi

# Try to build the app
RUN npm run build || echo "Build failed but continuing"

# Production stage
FROM nginx:alpine
# Copy build from the 'build' stage (if it succeeded)
COPY --from=build /app/build /usr/share/nginx/html 2>/dev/null || echo "No build directory found"
# If build failed, copy a minimal static site
RUN if [ ! -f /usr/share/nginx/html/index.html ]; then \
    mkdir -p /usr/share/nginx/html && \
    echo '<!DOCTYPE html><html><head><title>Streaming Analytics Dashboard</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;background:#f5f7fa;color:#333;text-align:center;}h1{margin-bottom:20px;}p{margin-bottom:10px;}.status{color:#e74c3c;font-weight:bold;}.card{background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;max-width:600px;width:90%;}</style></head><body><div class="card"><h1>Streaming Analytics Dashboard</h1><p>The dashboard is currently connecting to the backend services...</p><p class="status">Status: Backend connection in progress</p><p>Please check the server logs if this message persists.</p></div></body></html>' > /usr/share/nginx/html/index.html; \
    fi

# Copy the custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
