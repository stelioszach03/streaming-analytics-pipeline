import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.client = null;
    this.subscriptions = {};
    this.connected = false;
    this.reconnectInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
  }

  connect(callbacks = {}) {
    // Create a socket and STOMP client
    const socket = new SockJS(this.serverUrl);
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: process.env.NODE_ENV !== 'production' ? console.log : () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        
        // Resubscribe to previous topics if reconnecting
        Object.entries(this.subscriptions).forEach(([topic, callback]) => {
          this._subscribe(topic, callback);
        });
        
        if (callbacks.onConnect) {
          callbacks.onConnect();
        }
      },
      onStompError: (error) => {
        this.connected = false;
        
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        
        // Attempt to reconnect
        this._reconnect(callbacks);
      }
    });
    
    this.client.activate();
  }
  
  _reconnect(callbacks) {
    if (this.reconnectInterval === null && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectInterval = setInterval(() => {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
          console.error('Max reconnect attempts reached. Giving up.');
          return;
        }
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect(callbacks);
      }, this.reconnectDelay);
    }
  }
  
  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
      this.subscriptions = {};
      
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    }
  }
  
  subscribe(topic, callback) {
    this.subscriptions[topic] = callback;
    
    if (this.connected) {
      return this._subscribe(topic, callback);
    }
  }
  
  _subscribe(topic, callback) {
    return this.client.subscribe(topic, callback);
  }
  
  unsubscribe(topic) {
    if (this.subscriptions[topic]) {
      delete this.subscriptions[topic];
    }
  }
  
  send(destination, body) {
    if (this.connected) {
      this.client.publish({
        destination: destination,
        body: JSON.stringify(body)
      });
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }
  
  isConnected() {
    return this.connected;
  }
}

export default WebSocketService;