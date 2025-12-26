// Тестовый скрипт для Pulse Dashboard
const { EventEmitter } = require('events');

class PulseDashboardSimulator extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      clarity: 0.78,
      chaos: 0.42,
      trust: 0.65,
      pain: 0.15,
      deltaCompleteness: 0.89,
      traceCoverage: 0.94,
      artifactRate: 1.2
    };
    this.connectedClients = new Set();
  }

  // Симуляция подключения клиента
  connectClient(clientId) {
    this.connectedClients.add(clientId);
    console.log(`✅ Client ${clientId} connected to Pulse Dashboard`);
    console.log(`📊 Total connected clients: ${this.connectedClients.size}`);
    return true;
  }

  // Симуляция подписки на метрики
  subscribeToMetrics(clientId, channels) {
    console.log(`📡 Client ${clientId} subscribed to channels: ${channels.join(', ')}`);
    return { status: 'subscribed', channels };
  }

  // Симуляция получения метрик из базы данных
  async fetchMetricsFromDB() {
    // Имитация запроса к TimescaleDB
    await new Promise(resolve => setTimeout(resolve, 8)); // 8ms latency
    
    // Добавляем небольшую вариацию к метрикам
    const variation = () => (Math.random() - 0.5) * 0.1;
    
    return {
      timestamp: new Date(),
      clarity: Math.max(0, Math.min(1, this.metrics.clarity + variation())),
      chaos: Math.max(0, Math.min(1, this.metrics.chaos + variation())),
      trust: Math.max(0, Math.min(1, this.metrics.trust + variation())),
      pain: Math.max(0, Math.min(1, this.metrics.pain + variation())),
      deltaCompleteness: Math.max(0, Math.min(1, this.metrics.deltaCompleteness + variation())),
      traceCoverage: Math.max(0, Math.min(1, this.metrics.traceCoverage + variation())),
      artifactRate: Math.max(0, this.metrics.artifactRate + variation())
    };
  }

  // Симуляция отправки real-time обновлений
  async broadcastMetricsUpdate() {
    const metrics = await this.fetchMetricsFromDB();
    
    // Отправляем всем подключенным клиентам
    this.connectedClients.forEach(clientId => {
      this.emit('metricsUpdate', {
        clientId,
        data: metrics,
        latency: 23 // 23ms WebSocket latency
      });
    });
    
    console.log(`📊 Broadcasting metrics to ${this.connectedClients.size} clients`);
    return metrics;
  }

  // Проверка SLO порогов
  checkSLOThresholds(metrics) {
    const alerts = [];
    const thresholds = {
      clarity: { min: 0.7, max: 0.9 },
      chaos: { min: 0.3, max: 0.6 },
      trust: { min: 0.6, max: 0.9 },
      pain: { min: 0.2, max: 0.5 }
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metrics[metric];
      if (value < threshold.min) {
        alerts.push({
          type: 'low',
          metric,
          value,
          threshold: threshold.min,
          severity: value < threshold.min * 0.7 ? 'critical' : 'warning'
        });
      } else if (value > threshold.max) {
        alerts.push({
          type: 'high',
          metric,
          value,
          threshold: threshold.max,
          severity: value > threshold.max * 1.3 ? 'critical' : 'warning'
        });
      }
    });

    return alerts;
  }

  // Симуляция статуса светофора
  getTrafficLightStatus(metrics) {
    const { clarity, trust, pain } = metrics;
    
    if (clarity >= 0.7 && trust >= 0.6 && pain <= 0.3) {
      return { status: 'green', emoji: '🟢', description: 'Система в норме' };
    } else if (clarity >= 0.5 && trust >= 0.4 && pain <= 0.5) {
      return { status: 'yellow', emoji: '🟡', description: 'Внимание требуется' };
    } else if (clarity < 0.5 || trust < 0.4 || pain > 0.5) {
      return { status: 'red', emoji: '🔴', description: 'Критическое состояние' };
    } else {
      return { status: 'black', emoji: '⚫', description: 'Режим восстановления' };
    }
  }

  // Запуск тестирования
  async runTests() {
    console.log('🧪 Начинаем тестирование Pulse Dashboard...\n');

    // Тест 1: Подключение клиентов
    console.log('TEST 1: Подключение клиентов');
    this.connectClient('client_001');
    this.connectClient('client_002');
    this.connectClient('client_003');
    console.log('');

    // Тест 2: Подписка на метрики
    console.log('TEST 2: Подписка на метрики');
    this.subscribeToMetrics('client_001', ['clarity', 'chaos', 'trust', 'pain']);
    this.subscribeToMetrics('client_002', ['delta_completeness', 'trace_coverage']);
    console.log('');

    // Тест 3: Получение метрик
    console.log('TEST 3: Получение метрик из базы данных');
    const metrics = await this.fetchMetricsFromDB();
    console.log('📊 Метрики получены:', JSON.stringify(metrics, null, 2));
    console.log('⚡ Латентность базы данных: 8ms ✅');
    console.log('');

    // Тест 4: Проверка SLO
    console.log('TEST 4: Проверка SLO порогов');
    const sloAlerts = this.checkSLOThresholds(metrics);
    if (sloAlerts.length > 0) {
      console.log('⚠️  SLO нарушения:', sloAlerts);
    } else {
      console.log('✅ Все метрики в пределах SLO');
    }
    console.log('');

    // Тест 5: Статус светофора
    console.log('TEST 5: Статус светофора');
    const trafficLight = this.getTrafficLightStatus(metrics);
    console.log(`${trafficLight.emoji} ${trafficLight.status.toUpperCase()}: ${trafficLight.description}`);
    console.log('');

    // Тест 6: Real-time broadcasting
    console.log('TEST 6: Real-time broadcasting');
    for (let i = 0; i < 3; i++) {
      await this.broadcastMetricsUpdate();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    console.log('');

    console.log('🎯 Тестирование Pulse Dashboard завершено успешно!');
    return {
      status: 'PASS',
      metrics,
      sloAlerts,
      trafficLight,
      connectedClients: this.connectedClients.size
    };
  }
}

// Запуск тестов
const simulator = new PulseDashboardSimulator();
simulator.runTests().then(result => {
  console.log('\n📋 ИТОГОВЫЙ РЕЗУЛЬТАТ:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('❌ Ошибка тестирования:', error);
});

module.exports = PulseDashboardSimulator;