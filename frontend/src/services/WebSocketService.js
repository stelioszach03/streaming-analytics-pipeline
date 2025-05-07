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
    console.log(`Επιχειρείται σύνδεση στο WebSocket στη διεύθυνση ${this.serverUrl}`);
    
    // Create a simple WebSocket connection (native WebSocket)
    const socket = new WebSocket(this.serverUrl);
    
    socket.onopen = () => {
      console.log('WebSocket συνδέθηκε επιτυχώς');
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
      console.log('Η σύνδεση WebSocket έκλεισε');
      this.connected = false;
      
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect();
      }
      
      // Attempt to reconnect
      this._reconnect(callbacks);
    };
    
    socket.onerror = (error) => {
      console.error('Σφάλμα WebSocket:', error);
      this.connected = false;
      
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Ελήφθη μήνυμα:', message);
        
        // Route message to appropriate subscription callback
        const destination = message.destination;
        const body = message.body;
        
        if (destination && this.subscriptions[destination]) {
          this.subscriptions[destination]({
            body: body
          });
        }
      } catch (error) {
        console.error('Σφάλμα επεξεργασίας μηνύματος:', error);
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
          console.error('Επιτεύχθηκε ο μέγιστος αριθμός προσπαθειών επανασύνδεσης. Ακύρωση.');
          return;
        }
        
        console.log(`Προσπάθεια επανασύνδεσης (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
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
    console.log(`Εγγραφή στο ${topic}`);
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
      console.error('Δεν είναι δυνατή η αποστολή μηνύματος: Το WebSocket δεν είναι συνδεδεμένο');
    }
  }
  
  isConnected() {
    return this.connected;
  }
}

export default WebSocketService;