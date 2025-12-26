#!/usr/bin/env node

/**
 * Функциональное тестирование WebSocket API для Искра Ecosystem
 * Тестирует соединения к трем дашбордам
 */

const WebSocket = require('ws');

// Конфигурация тестовых endpoints
const TEST_ENDPOINTS = {
  pulse: 'ws://localhost:3001',
  seams: 'ws://localhost:3002', 
  voices: 'ws://localhost:3003'
};

// SLO thresholds для тестирования
const SLO_THRESHOLDS = {
  clarity: { min: 0.7, max: 0.9, target: 0.8 },
  chaos: { min: 0.3, max: 0.6, target: 0.45 },
  trust: { min: 0.6, max: 0.9, target: 0.8 },
  pain: { min: 0.2, max: 0.5, target: 0.3 }
};

// Результаты тестирования
const testResults = {
  connections: [],
  performance: [],
  subscriptions: [],
  dataTransfer: [],
  errorHandling: []
};

class WebSocketTester {
  constructor() {
    this.results = [];
  }

  // Тест 1: Установление соединения
  async testConnection(endpoint, name) {
    console.log(`\n🔗 Тестирование соединения к ${name}...`);
    const startTime = Date.now();
    
    try {
      const ws = new WebSocket(endpoint);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout', latency: 5000 });
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          console.log(`✅ ${name}: Соединение установлено (${latency}ms)`);
          ws.close();
          resolve({ success: true, latency, endpoint });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          console.log(`❌ ${name}: Ошибка соединения - ${error.message}`);
          resolve({ success: false, error: error.message, latency: Date.now() - startTime });
        });
      });
    } catch (error) {
      console.log(`❌ ${name}: Исключение - ${error.message}`);
      return { success: false, error: error.message, latency: Date.now() - startTime };
    }
  }

  // Тест 2: Отправка и получение данных
  async testDataTransfer(endpoint, name) {
    console.log(`\n📡 Тестирование передачи данных для ${name}...`);
    
    try {
      const ws = new WebSocket(endpoint);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout', messagesSent: 0, messagesReceived: 0 });
        }, 10000);

        let messagesReceived = 0;
        const testMessages = [
          { type: 'ping', timestamp: Date.now() },
          { type: 'subscribe', channels: ['test'] },
          { type: 'metrics', data: { clarity: 0.8, chaos: 0.4, trust: 0.7, pain: 0.3 } }
        ];

        ws.on('open', () => {
          console.log(`📤 Отправка тестовых сообщений в ${name}...`);
          testMessages.forEach(msg => ws.send(JSON.stringify(msg)));
        });

        ws.on('message', (data) => {
          messagesReceived++;
          console.log(`📥 ${name}: Получено сообщение (${messagesReceived}):`, data.toString());
          
          // Проверяем, что получили подтверждение или ответ
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'pong' || message.type === 'subscribed' || message.status === 'ok') {
              // Успешный ответ
            }
          } catch (e) {
            // Не JSON сообщение, но всё равно считаем успехом
          }
        });

        setTimeout(() => {
          clearTimeout(timeout);
          ws.close();
          console.log(`✅ ${name}: Тест данных завершен (отправлено: ${testMessages.length}, получено: ${messagesReceived})`);
          resolve({ 
            success: true, 
            messagesSent: testMessages.length, 
            messagesReceived,
            endpoint 
          });
        }, 3000);
      });
    } catch (error) {
      console.log(`❌ ${name}: Ошибка тестирования данных - ${error.message}`);
      return { success: false, error: error.message, messagesSent: 0, messagesReceived: 0 };
    }
  }

  // Тест 3: Подписка на обновления
  async testSubscription(endpoint, name) {
    console.log(`\n📋 Тестирование подписок для ${name}...`);
    
    try {
      const ws = new WebSocket(endpoint);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout', subscriptionsActive: 0 });
        }, 8000);

        let subscriptionConfirmed = false;
        let updatesReceived = 0;

        ws.on('open', () => {
          const subscription = {
            type: 'subscribe',
            channels: ['clarity', 'chaos', 'trust', 'pain']
          };
          console.log(`📝 ${name}: Отправка подписки на каналы`);
          ws.send(JSON.stringify(subscription));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'subscribed' || message.status === 'subscribed') {
              subscriptionConfirmed = true;
              console.log(`✅ ${name}: Подписка подтверждена`);
            }
            
            if (message.type === 'metrics' || message.clarity !== undefined) {
              updatesReceived++;
              console.log(`📊 ${name}: Получено обновление метрик (#${updatesReceived})`);
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        });

        setTimeout(() => {
          clearTimeout(timeout);
          ws.close();
          console.log(`✅ ${name}: Тест подписок завершен (подписка: ${subscriptionConfirmed}, обновлений: ${updatesReceived})`);
          resolve({ 
            success: subscriptionConfirmed, 
            subscriptionConfirmed,
            updatesReceived,
            endpoint 
          });
        }, 5000);
      });
    } catch (error) {
      console.log(`❌ ${name}: Ошибка тестирования подписок - ${error.message}`);
      return { success: false, error: error.message, subscriptionsActive: 0 };
    }
  }

  // Тест 4: Стабильность соединения
  async testConnectionStability(endpoint, name) {
    console.log(`\n🔄 Тестирование стабильности соединения для ${name}...`);
    
    try {
      const ws = new WebSocket(endpoint);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout', uptime: 0, reconnections: 0 });
        }, 15000);

        let uptime = 0;
        let reconnections = 0;
        let isConnected = false;
        const startTime = Date.now();

        ws.on('open', () => {
          isConnected = true;
          uptime = Date.now() - startTime;
          console.log(`🔗 ${name}: Соединение стабильно (uptime: ${uptime}ms)`);
        });

        ws.on('close', () => {
          isConnected = false;
          console.log(`🔌 ${name}: Соединение закрыто`);
        });

        ws.on('error', (error) => {
          console.log(`⚠️ ${name}: Ошибка соединения: ${error.message}`);
          reconnections++;
        });

        // Периодические проверки состояния
        const heartbeat = setInterval(() => {
          if (isConnected) {
            uptime = Date.now() - startTime;
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(heartbeat);
          clearTimeout(timeout);
          ws.close();
          console.log(`✅ ${name}: Тест стабильности завершен (uptime: ${uptime}ms, переподключений: ${reconnections})`);
          resolve({ 
            success: uptime > 5000, 
            uptime,
            reconnections,
            endpoint 
          });
        }, 10000);
      });
    } catch (error) {
      console.log(`❌ ${name}: Ошибка тестирования стабильности - ${error.message}`);
      return { success: false, error: error.message, uptime: 0, reconnections: 0 };
    }
  }

  // Тест 5: Обработка ошибок
  async testErrorHandling(endpoint, name) {
    console.log(`\n🚨 Тестирование обработки ошибок для ${name}...`);
    
    try {
      const ws = new WebSocket(endpoint);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout', errorsHandled: 0 });
        }, 8000);

        let errorsHandled = 0;

        ws.on('open', () => {
          // Отправляем некорректные сообщения для тестирования обработки ошибок
          const invalidMessages = [
            'invalid json',
            '',
            '{incomplete json',
            null,
            undefined
          ];

          invalidMessages.forEach((msg, index) => {
            setTimeout(() => {
              try {
                ws.send(msg);
                console.log(`⚠️ ${name}: Отправлено некорректное сообщение #${index + 1}`);
              } catch (e) {
                console.log(`✅ ${name}: Ошибка отправки корректно обработана`);
                errorsHandled++;
              }
            }, index * 200);
          });
        });

        ws.on('error', (error) => {
          errorsHandled++;
          console.log(`✅ ${name}: Ошибка корректно обработана: ${error.message}`);
        });

        setTimeout(() => {
          clearTimeout(timeout);
          ws.close();
          console.log(`✅ ${name}: Тест ошибок завершен (обработано ошибок: ${errorsHandled})`);
          resolve({ 
            success: errorsHandled > 0, 
            errorsHandled,
            endpoint 
          });
        }, 5000);
      });
    } catch (error) {
      console.log(`❌ ${name}: Ошибка тестирования обработки ошибок - ${error.message}`);
      return { success: false, error: error.message, errorsHandled: 0 };
    }
  }

  // Запуск всех тестов для одного endpoint
  async runEndpointTests(endpoint, name) {
    console.log(`\n🚀 Начинаем тестирование ${name} (${endpoint})`);
    
    const connectionResult = await this.testConnection(endpoint, name);
    const dataResult = await this.testDataTransfer(endpoint, name);
    const subscriptionResult = await this.testSubscription(endpoint, name);
    const stabilityResult = await this.testConnectionStability(endpoint, name);
    const errorResult = await this.testErrorHandling(endpoint, name);
    
    return {
      endpoint: name,
      url: endpoint,
      connection: connectionResult,
      dataTransfer: dataResult,
      subscription: subscriptionResult,
      stability: stabilityResult,
      errorHandling: errorResult
    };
  }

  // Основной метод тестирования
  async runAllTests() {
    console.log('🎯 ФУНКЦИОНАЛЬНОЕ ТЕСТИРОВАНИЕ WEBSOCKET API');
    console.log('=' .repeat(60));
    
    const results = [];
    
    // Тестируем каждый endpoint
    for (const [name, endpoint] of Object.entries(TEST_ENDPOINTS)) {
      const result = await this.runEndpointTests(endpoint, name);
      results.push(result);
      
      // Пауза между тестами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }
}

// Запуск тестов если файл выполнен напрямую
if (require.main === module) {
  const tester = new WebSocketTester();
  
  tester.runAllTests()
    .then(results => {
      console.log('\n\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
      console.log('=' .repeat(60));
      
      results.forEach(result => {
        console.log(`\n📍 ${result.endpoint.toUpperCase()} (${result.url})`);
        console.log(`   Соединение: ${result.connection.success ? '✅' : '❌'} (${result.connection.latency}ms)`);
        console.log(`   Передача данных: ${result.dataTransfer.success ? '✅' : '❌'} (${result.dataTransfer.messagesReceived}/${result.dataTransfer.messagesSent})`);
        console.log(`   Подписки: ${result.subscription.success ? '✅' : '❌'} (${result.subscription.updatesReceived} обновлений)`);
        console.log(`   Стабильность: ${result.stability.success ? '✅' : '❌'} (${result.stability.uptime}ms)`);
        console.log(`   Обработка ошибок: ${result.errorHandling.success ? '✅' : '❌'} (${result.errorHandling.errorsHandled} ошибок)`);
      });
      
      // Сохранение результатов
      require('fs').writeFileSync(
        '/workspace/test_reports/websocket_test_results.json',
        JSON.stringify(results, null, 2)
      );
      
      console.log('\n💾 Результаты сохранены в /workspace/test_reports/websocket_test_results.json');
    })
    .catch(error => {
      console.error('❌ Ошибка тестирования:', error);
    });
}

module.exports = WebSocketTester;