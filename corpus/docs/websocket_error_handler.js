#!/usr/bin/env node

/**
 * WebSocket Error Handler для экосистемы Искра
 * Реализует автоматическое переподключение, heartbeat, логирование и fallback стратегии
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class IskraWebSocketErrorHandler extends EventEmitter {
  constructor(config) {
    super();
    this.config = this.loadConfig(config);
    this.connections = new Map();
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnections: 0,
      heartbeatFailures: 0,
      fallbackActivations: 0,
      totalUptime: 0
    };
    this.isShuttingDown = false;
    
    // Запускаем мониторинг
    this.startMonitoring();
  }

  loadConfig(config) {
    const defaultConfig = {
      connections: {
        pulse: {
          url: 'ws://localhost:3001',
          name: 'Pulse Dashboard',
          priority: 1,
          backup_urls: []
        },
        seams: {
          url: 'ws://localhost:3002',
          name: 'Seams Dashboard',
          priority: 2,
          backup_urls: []
        },
        voices: {
          url: 'ws://localhost:3003',
          name: 'Voices Dashboard',
          priority: 3,
          backup_urls: []
        }
      },
      reconnection: {
        max_attempts: 10,
        initial_delay: 1000,
        backoff_multiplier: 1.5,
        max_delay: 30000
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 10000,
        failure_threshold: 3
      },
      logging: {
        level: 'info',
        enableStructuredLogging: true,
        logFile: './logs/websocket-errors.log'
      },
      fallback: {
        enabled: true,
        bufferMessages: true,
        degradedService: true
      }
    };

    // Загружаем конфигурацию из файла если указан
    if (config?.configFile) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(config.configFile, 'utf8'));
        return this.deepMerge(defaultConfig, fileConfig);
      } catch (error) {
        console.warn('Не удалось загрузить конфигурацию из файла, используем defaults:', error.message);
      }
    }

    return this.deepMerge(defaultConfig, config || {});
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  async connectAll() {
    console.log('🚀 Запуск подключения ко всем WebSocket endpoints...');
    
    for (const [name, config] of Object.entries(this.config.connections)) {
      this.connectToEndpoint(name, config).catch(error => {
        console.error(`❌ Ошибка подключения к ${name}:`, error);
      });
    }
  }

  async connectToEndpoint(name, config) {
    console.log(`🔗 Подключение к ${name}: ${config.url}`);
    
    let attempt = 0;
    const maxAttempts = this.config.reconnection.max_attempts;
    
    while (attempt < maxAttempts && !this.isShuttingDown) {
      attempt++;
      this.metrics.connectionAttempts++;
      
      try {
        const ws = await this.createConnection(name, config.url);
        this.setupConnectionHandlers(name, ws, config);
        
        console.log(`✅ ${name}: Соединение установлено (попытка ${attempt})`);
        this.metrics.successfulConnections++;
        
        // Начинаем heartbeat если включен
        if (this.config.heartbeat.enabled) {
          this.startHeartbeat(name, ws);
        }
        
        return ws;
        
      } catch (error) {
        console.log(`❌ ${name}: Ошибка подключения (попытка ${attempt}/${maxAttempts})`, error.message);
        this.metrics.failedConnections++;
        
        if (attempt < maxAttempts) {
          const delay = this.calculateReconnectDelay(attempt);
          console.log(`⏰ Переподключение к ${name} через ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    // Если все попытки исчерпаны, активируем fallback
    console.warn(`🚨 ${name}: Все попытки подключения исчерпаны, активируем fallback`);
    this.activateFallback(name, config);
  }

  createConnection(name, url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Connection timeout'));
      }, 10000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve(ws);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  setupConnectionHandlers(name, ws, config) {
    this.connections.set(name, { ws, config, lastActivity: Date.now() });
    
    ws.on('message', (data) => {
      this.handleMessage(name, data);
      this.resetHeartbeat(name);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 ${name}: Соединение закрыто (${code}: ${reason})`);
      this.handleDisconnection(name, code, reason);
    });
    
    ws.on('error', (error) => {
      console.error(`❌ ${name}: WebSocket ошибка`, error);
      this.handleError(name, error);
    });
    
    // Обработка pong ответов на ping
    ws.on('pong', (data) => {
      this.handlePong(name, data);
    });
  }

  startHeartbeat(name, ws) {
    const heartbeatData = JSON.stringify({
      type: 'ping',
      timestamp: Date.now(),
      delta: 'heartbeat_sent',
      omega: 1.0
    });
    
    const heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping(heartbeatData);
          console.log(`💓 ${name}: Отправлен heartbeat`);
        } catch (error) {
          console.error(`❌ ${name}: Ошибка отправки heartbeat`, error);
        }
      }
    }, this.config.heartbeat.interval);
    
    // Сохраняем таймер для очистки
    const connection = this.connections.get(name);
    if (connection) {
      connection.heartbeatTimer = heartbeatTimer;
    }
  }

  resetHeartbeat(name) {
    const connection = this.connections.get(name);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  handlePong(name, data) {
    try {
      const pongData = JSON.parse(data.toString());
      const latency = Date.now() - pongData.timestamp;
      
      console.log(`💓 ${name}: Получен pong (latency: ${latency}ms)`);
      
      // Логируем heartbeat успех
      this.logFractalEvent({
        type: 'heartbeat_pong',
        endpoint: name,
        latency,
        timestamp: Date.now(),
        delta: 'heartbeat_success',
        omega: this.calculateLatencyConfidence(latency),
        lambda: 'websocket_heartbeat_monitoring'
      });
      
    } catch (error) {
      console.warn(`⚠️ ${name}: Некорректный pong data`);
    }
  }

  handleDisconnection(name, code, reason) {
    const connection = this.connections.get(name);
    if (connection?.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }
    
    this.connections.delete(name);
    
    // Логируем отключение
    this.logFractalEvent({
      type: 'disconnection',
      endpoint: name,
      code,
      reason: reason.toString(),
      timestamp: Date.now(),
      delta: 'connection_lost',
      omega: this.calculateDisconnectionConfidence(code),
      lambda: 'websocket_connection_management'
    });
    
    // Пытаемся переподключиться
    if (!this.isShuttingDown && code !== 1000) { // 1000 = нормальное закрытие
      this.metrics.reconnections++;
      this.connectToEndpoint(name, connection.config).catch(error => {
        console.error(`❌ ${name}: Ошибка переподключения`, error);
      });
    }
  }

  handleError(name, error) {
    this.logFractalEvent({
      type: 'websocket_error',
      endpoint: name,
      error: error.message,
      errorType: error.constructor.name,
      timestamp: Date.now(),
      delta: 'error_detected',
      omega: 0.8,
      lambda: 'websocket_error_handling'
    });
    
    this.emit('error', { name, error });
  }

  activateFallback(name, config) {
    this.metrics.fallbackActivations++;
    
    console.log(`🛡️ ${name}: Активация fallback режима`);
    
    // Попробуем подключиться к backup URL если есть
    if (config.backup_urls && config.backup_urls.length > 0) {
      this.tryBackupConnections(name, config.backup_urls);
    } else {
      this.activateDegradedService(name);
    }
    
    // Логируем активацию fallback
    this.logFractalEvent({
      type: 'fallback_activated',
      endpoint: name,
      timestamp: Date.now(),
      delta: 'fallback_activated',
      omega: 0.3,
      lambda: 'websocket_fallback_strategy'
    });
  }

  async tryBackupConnections(name, backupUrls) {
    for (const backupUrl of backupUrls) {
      try {
        console.log(`🔄 ${name}: Попытка подключения к backup: ${backupUrl}`);
        const ws = await this.createConnection(name, backupUrl);
        this.setupConnectionHandlers(name, ws, { url: backupUrl });
        console.log(`✅ ${name}: Fallback подключение установлено`);
        return;
      } catch (error) {
        console.warn(`❌ ${name}: Backup подключение не удалось: ${error.message}`);
      }
    }
    
    this.activateDegradedService(name);
  }

  activateDegradedService(name) {
    console.log(`⚠️ ${name}: Активация degraded service режима`);
    
    // Создаем "мягкое" соединение с периодическими попытками восстановления
    const degradedTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.connectToEndpoint(name, this.config.connections[name]).then(ws => {
          if (ws) {
            clearInterval(degradedTimer);
            console.log(`✅ ${name}: Восстановлено нормальное соединение`);
          }
        });
      }
    }, 60000); // Попытка каждую минуту
    
    const connection = this.connections.get(name);
    if (connection) {
      connection.degradedTimer = degradedTimer;
    }
  }

  calculateReconnectDelay(attempt) {
    const baseDelay = this.config.reconnection.initial_delay;
    const multiplier = this.config.reconnection.backoff_multiplier;
    const maxDelay = this.config.reconnection.max_delay;
    
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  calculateLatencyConfidence(latency) {
    if (latency < 100) return 0.9;
    if (latency < 300) return 0.7;
    if (latency < 500) return 0.5;
    return 0.3;
  }

  calculateDisconnectionConfidence(code) {
    if (code === 1006) return 0.9; // Abnormal closure
    if (code === 1011) return 0.8; // Server error
    if (code === 1012) return 0.7; // Service restart
    return 0.5;
  }

  logFractalEvent(event) {
    // Формируем ∆DΩΛ событие
    const deltaEvent = {
      timestamp: new Date().toISOString(),
      level: this.mapLogLevel(event.omega),
      component: 'websocket_error_handler',
      event_type: event.type,
      delta: event.delta || event.type,
      omega: event.omega || 0.5,
      lambda: event.lambda || 'websocket_operations',
      data: {
        endpoint: event.endpoint,
        error: event.error,
        latency: event.latency,
        ...event
      },
      fractal_metadata: {
        voice_pain: this.calculateVoicePain(event),
        voice_chaos: this.calculateVoiceChaos(event),
        voice_trust: this.calculateVoiceTrust(event),
        seam_id: this.identifyRelevantSeam(event.type)
      }
    };

    // Выводим в консоль
    if (this.config.logging.enableStructuredLogging) {
      console.log(JSON.stringify(deltaEvent));
    } else {
      console.log(`[${deltaEvent.level}] ${deltaEvent.component}: ${deltaEvent.event_type}`, deltaEvent.data);
    }

    // Сохраняем в файл
    this.saveToLogFile(deltaEvent);
  }

  calculateVoicePain(event) {
    const painMap = {
      'connection_failed': 0.7,
      'heartbeat_timeout': 0.4,
      'websocket_error': 0.6,
      'fallback_activated': 0.8,
      'disconnection': 0.5
    };
    return painMap[event.type] || 0.2;
  }

  calculateVoiceChaos(event) {
    const chaosMap = {
      'fallback_activated': 0.8,
      'websocket_error': 0.6,
      'disconnection': 0.4,
      'connection_failed': 0.3
    };
    return chaosMap[event.type] || 0.2;
  }

  calculateVoiceTrust(event) {
    const trustMap = {
      'heartbeat_pong': 0.9,
      'reconnection_success': 0.8,
      'connection_established': 0.7,
      'fallback_activated': 0.3,
      'connection_failed': 0.2
    };
    return trustMap[event.type] || 0.5;
  }

  identifyRelevantSeam(eventType) {
    const seamMap = {
      'connection_failed': 'network_infrastructure',
      'heartbeat_timeout': 'communication_protocol',
      'websocket_error': 'connection_management',
      'fallback_activated': 'resilience_mechanisms',
      'disconnection': 'lifecycle_management'
    };
    return seamMap[eventType] || 'general_operation';
  }

  mapLogLevel(omega) {
    if (omega >= 0.8) return 'ERROR';
    if (omega >= 0.6) return 'WARN';
    if (omega >= 0.4) return 'INFO';
    return 'DEBUG';
  }

  saveToLogFile(event) {
    try {
      const logDir = path.dirname(this.config.logging.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(this.config.logging.logFile, JSON.stringify(event) + '\n');
    } catch (error) {
      console.warn('Не удалось сохранить в лог файл:', error.message);
    }
  }

  handleMessage(name, data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'pong') {
        this.handlePong(name, data);
        return;
      }
      
      // Логируем входящие сообщения
      this.logFractalEvent({
        type: 'message_received',
        endpoint: name,
        messageType: message.type,
        timestamp: Date.now(),
        delta: 'message_processed',
        omega: 0.8,
        lambda: 'websocket_message_handling'
      });
      
      this.emit('message', { name, message });
      
    } catch (error) {
      console.warn(`⚠️ ${name}: Некорректное сообщение`, error.message);
    }
  }

  startMonitoring() {
    // Мониторинг состояния соединений
    setInterval(() => {
      this.checkConnectionsHealth();
      this.updateMetrics();
    }, 10000);
    
    // Периодическое сохранение метрик
    setInterval(() => {
      this.saveMetrics();
    }, 60000);
  }

  checkConnectionsHealth() {
    const now = Date.now();
    
    for (const [name, connection] of this.connections) {
      const timeSinceActivity = now - connection.lastActivity;
      
      if (this.config.heartbeat.enabled && timeSinceActivity > this.config.heartbeat.interval * 2) {
        console.warn(`⚠️ ${name}: Долгое отсутствие активности (${Math.round(timeSinceActivity / 1000)}s)`);
        
        this.metrics.heartbeatFailures++;
        this.logFractalEvent({
          type: 'heartbeat_timeout',
          endpoint: name,
          timeSinceActivity,
          timestamp: now,
          delta: 'heartbeat_timeout',
          omega: 0.4,
          lambda: 'websocket_health_monitoring'
        });
      }
    }
  }

  updateMetrics() {
    this.metrics.totalUptime += 10; // каждые 10 секунд
    
    const healthyConnections = this.connections.size;
    const totalEndpoints = Object.keys(this.config.connections).length;
    const healthPercentage = (healthyConnections / totalEndpoints * 100).toFixed(1);
    
    this.emit('metrics', {
      ...this.metrics,
      healthyConnections,
      totalEndpoints,
      healthPercentage: parseFloat(healthPercentage)
    });
  }

  saveMetrics() {
    try {
      const metricsFile = './logs/websocket-metrics.json';
      const metricsData = {
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
        connections: Object.fromEntries(
          Array.from(this.connections.entries()).map(([name, conn]) => [
            name, 
            {
              status: 'connected',
              uptime: Date.now() - conn.lastActivity,
              hasHeartbeat: !!conn.heartbeatTimer
            }
          ])
        )
      };
      
      fs.writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.warn('Не удалось сохранить метрики:', error.message);
    }
  }

  async shutdown() {
    console.log('🛑 Завершение работы WebSocket Error Handler...');
    this.isShuttingDown = true;
    
    // Закрываем все соединения
    for (const [name, connection] of this.connections) {
      if (connection.ws) {
        connection.ws.close(1000, 'Shutting down');
      }
      if (connection.heartbeatTimer) {
        clearInterval(connection.heartbeatTimer);
      }
      if (connection.degradedTimer) {
        clearInterval(connection.degradedTimer);
      }
    }
    
    console.log('✅ WebSocket Error Handler завершен');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI интерфейс
if (require.main === module) {
  const handler = new IskraWebSocketErrorHandler();
  
  // Обработка сигналов завершения
  process.on('SIGINT', () => handler.shutdown());
  process.on('SIGTERM', () => handler.shutdown());
  
  // Запуск подключений
  handler.connectAll();
  
  // Логирование метрик
  handler.on('metrics', (metrics) => {
    console.log(`📊 Health: ${metrics.healthPercentage}% | Reconnections: ${metrics.reconnections} | Fallback: ${metrics.fallbackActivations}`);
  });
  
  // Обработка ошибок
  handler.on('error', (error) => {
    console.error('🚨 WebSocket Error:', error);
  });
  
  console.log('🎯 WebSocket Error Handler запущен');
  console.log('📊 Мониторинг активен, нажмите Ctrl+C для остановки');
}

module.exports = IskraWebSocketErrorHandler;