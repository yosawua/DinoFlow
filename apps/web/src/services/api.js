/**
 * DinoFlow Client API & Real-Time Sync Service
 * Works Local-First with offline persistence and automatic fallback.
 */

const API_BASE = '/api/v1';

class ApiService {
  constructor() {
    this.ws = null;
    this.sse = null;
    this.telemetrySubscribers = new Set();
    this.alertSubscribers = new Set();
    this.scenarioSubscribers = new Set();
    this.connectionStatusSubscribers = new Set();
    this.isConnected = false;
    this.reconnectTimer = null;
  }

  // Load cached state from LocalStorage for offline startup
  getCachedData(key, fallback = null) {
    try {
      const item = localStorage.getItem(`dinoflow_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  setCachedData(key, data) {
    try {
      localStorage.setItem(`dinoflow_${key}`, JSON.stringify(data));
    } catch (e) {}
  }

  // HTTP Endpoints
  async getSummaryMetrics() {
    try {
      const res = await fetch(`${API_BASE}/metrics/summary`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      this.setCachedData('summary', data);
      return data;
    } catch (e) {
      return this.getCachedData('summary', {
        healthIndex: 100,
        totalConsumptionLiters: 420,
        totalCost: 10.71,
        waterLostLiters: 0,
        financialLossCost: 0,
        activeAlertsCount: 0,
        severityCounts: { urgente: 0, alerta_temprana: 0, atencion: 0, normal: 0 }
      });
    }
  }

  async getLatestReadings() {
    try {
      const res = await fetch(`${API_BASE}/telemetry/latest`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      this.setCachedData('latest_readings', data);
      return data;
    } catch (e) {
      return this.getCachedData('latest_readings', []);
    }
  }

  async getAlerts(status = '') {
    try {
      const url = status ? `${API_BASE}/alerts?status=${status}` : `${API_BASE}/alerts`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      this.setCachedData('alerts', data);
      return data;
    } catch (e) {
      return this.getCachedData('alerts', []);
    }
  }

  async updateAlertStatus(alertId, status) {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  }

  async explainAlertWithAI(alertId) {
    const res = await fetch(`${API_BASE}/ai/explain-alert/${alertId}`, {
      method: 'POST'
    });
    return res.json();
  }

  async getDailyAIReport() {
    const res = await fetch(`${API_BASE}/ai/daily-report`, {
      method: 'POST'
    });
    return res.json();
  }

  async setSimulatorScenario(scenario) {
    const res = await fetch(`${API_BASE}/simulator/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    return res.json();
  }

  async pairNode(payload) {
    const res = await fetch(`${API_BASE}/nodes/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  // Real-Time Connection Setup
  initRealtime() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this._notifyStatus('connected');
        console.log('⚡ DinoFlow WebSocket Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'telemetry') {
            this.telemetrySubscribers.forEach(cb => cb(message.data));
          } else if (message.type === 'alert') {
            this.alertSubscribers.forEach(cb => cb(message.data));
          } else if (message.type === 'alert_updated') {
            this.alertSubscribers.forEach(cb => cb(message.data));
          } else if (message.type === 'scenario_changed') {
            this.scenarioSubscribers.forEach(cb => cb(message.data.scenario));
          }
        } catch (err) {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this._notifyStatus('reconnecting');
        this._retryConnection();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this._notifyStatus('fallback_sse');
        this._setupSseFallback();
      };
    } catch (e) {
      this._setupSseFallback();
    }
  }

  _retryConnection() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initRealtime();
    }, 3000);
  }

  _setupSseFallback() {
    if (this.sse) return;
    try {
      this.sse = new EventSource(`${API_BASE}/events`);
      this.sse.onopen = () => {
        this.isConnected = true;
        this._notifyStatus('sse_connected');
      };
      this.sse.addEventListener('telemetry', (e) => {
        const parsed = JSON.parse(e.data);
        this.telemetrySubscribers.forEach(cb => cb(parsed.data));
      });
      this.sse.addEventListener('alert', (e) => {
        const parsed = JSON.parse(e.data);
        this.alertSubscribers.forEach(cb => cb(parsed.data));
      });
      this.sse.onerror = () => {
        this._notifyStatus('offline');
      };
    } catch (err) {}
  }

  _notifyStatus(status) {
    this.connectionStatusSubscribers.forEach(cb => cb(status));
  }

  // Subscription hooks
  onTelemetry(callback) {
    this.telemetrySubscribers.add(callback);
    return () => this.telemetrySubscribers.delete(callback);
  }

  onAlert(callback) {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  onScenario(callback) {
    this.scenarioSubscribers.add(callback);
    return () => this.scenarioSubscribers.delete(callback);
  }

  onStatusChange(callback) {
    this.connectionStatusSubscribers.add(callback);
    return () => this.connectionStatusSubscribers.delete(callback);
  }
}

export const api = new ApiService();
