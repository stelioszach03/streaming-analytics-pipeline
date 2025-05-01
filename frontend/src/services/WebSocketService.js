import SockJS from 'sockjs-client';
import Stomp from '@stomp/stompjs';

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
    console.log(`Attempting to connect to WebSocket at ${this.serverUrl}`);
    
    // Create a simple WebSocket connection (not using SockJS)
    const socket = new WebSocket(this.serverUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      
      // Resubscribe to previous topics
      Object.entries(this.subscriptions).forEach(([topic, callback]) => {
        this._subscribe(topic, callback);
      });
      
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.connected = false;
      
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect();
      }
      
      // Attempt to reconnect
      this._reconnect(callbacks);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connected = false;
      
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        // Route message to appropriate subscription callback
        const destination = message.destination;
        const body = message.body;
        
        if (destination && this.subscriptions[destination]) {
          this.subscriptions[destination]({
            body: body
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
    
    this.client = socket;
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
      this.client.close();
      this.connected = false;
      this.subscriptions = {};
      
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    }
  }
  
  subscribe(topic, callback) {
    console.log(`Subscribing to ${topic}`);
    this.subscriptions[topic] = callback;
    
    if (this.connected) {
      return this._subscribe(topic, callback);
    }
  }
  
  _subscribe(topic, callback) {
    // STOMP-like subscribe message
    const subscribeMessage = {
      type: 'SUBSCRIBE',
      destination: topic
    };
    
    this.client.send(JSON.stringify(subscribeMessage));
    
    return {
      unsubscribe: () => {
        this.unsubscribe(topic);
      }
    };
  }
  
  unsubscribe(topic) {
    if (this.subscriptions[topic]) {
      delete this.subscriptions[topic];
      
      if (this.connected) {
        const unsubscribeMessage = {
          type: 'UNSUBSCRIBE',
          destination: topic
        };
        
        this.client.send(JSON.stringify(unsubscribeMessage));
      }
    }
  }
  
  send(destination, body) {
    if (this.connected) {
      const message = {
        type: 'SEND',
        destination: destination,
        body: typeof body === 'string' ? body : JSON.stringify(body)
      };
      
      this.client.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }
  
  isConnected() {
    return this.connected;
  }
}

export default WebSocketService;