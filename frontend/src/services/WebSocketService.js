import SockJS from 'sockjs-client';
import { Stomp } from 'stompjs';

class WebSocketService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.stompClient = null;
    this.subscriptions = {};
    this.connected = false;
    this.reconnectInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
  }

  connect(callbacks = {}) {
    const socket = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(socket);
    
    // Disable debug logging in production
    if (process.env.NODE_ENV === 'production') {
      this.stompClient.debug = null;
    }
    
    this.stompClient.connect(
      {}, // headers
      () => {
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
      (error) => {
        this.connected = false;
        
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        
        // Attempt to reconnect
        this._reconnect(callbacks);
      }
    );
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
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
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
      this._subscribe(topic, callback);
    }
  }
  
  _subscribe(topic, callback) {
    return this.stompClient.subscribe(topic, callback);
  }
  
  unsubscribe(topic) {
    if (this.subscriptions[topic]) {
      delete this.subscriptions[topic];
    }
  }
  
  send(destination, body) {
    if (this.connected) {
      this.stompClient.send(destination, {}, JSON.stringify(body));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }
  
  isConnected() {
    return this.connected;
  }
}

export default WebSocketService;
