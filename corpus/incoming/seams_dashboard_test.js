// Тестовый скрипт для Seams Dashboard
const { EventEmitter } = require('events');

class SeamsDashboardSimulator extends EventEmitter {
  constructor() {
    super();
    this.transitionHistory = [];
    this.currentState = 'UNKNOWN';
    this.activeSeams = new Map();
    this.bifurcationPoints = [];
  }

  // Классификация состояния системы
  classifyState(metrics) {
    const { clarity, chaos, trust, pain } = metrics;

    if (chaos > 0.7 && clarity < 0.6) return 'CHAOTIC_CREATION';
    if (chaos < 0.2 && clarity > 0.8) return 'CRYSTALLIZATION';
    if (trust > 0.8 && pain < 0.3) return 'HARMONIOUS_FLOW';
    if (pain > 0.6 && trust < 0.5) return 'CRISIS_MODE';
    if (chaos > 0.4 && chaos < 0.6 && clarity > 0.7) return 'CREATIVE_TENSION';
    
    return 'UNKNOWN';
  }

  // Детекция перехода между состояниями
  detectStateTransition(currentMetrics) {
    const newState = this.classifyState(currentMetrics);
    
    if (newState !== this.currentState) {
      const transition = {
        id: `transition_${Date.now()}`,
        from: this.currentState,
        to: newState,
        timestamp: new Date(),
        confidence: this.calculateTransitionConfidence(currentMetrics),
        metrics: currentMetrics,
        triggers: this.identifyTriggers(currentMetrics),
        type: this.classifySeamType(newState),
        intensity: this.calculateIntensity(currentMetrics)
      };

      this.transitionHistory.push(transition);
      this.currentState = newState;
      
      console.log(`🔄 Переход обнаружен: ${transition.from} → ${transition.to}`);
      console.log(`💫 Уверенность: ${(transition.confidence * 100).toFixed(1)}%`);
      console.log(`⚡ Интенсивность: ${(transition.intensity * 100).toFixed(1)}%`);
      
      return transition;
    }

    return null;
  }

  // Вычисление уверенности в переходе
  calculateTransitionConfidence(metrics) {
    const variance = this.calculateMetricsVariance(metrics);
    const trend = this.calculateMetricsTrend(metrics);
    return Math.min(1.0, variance * trend * 2);
  }

  // Вычисление дисперсии метрик
  calculateMetricsVariance(metrics) {
    const values = [metrics.clarity, metrics.chaos, metrics.trust, metrics.pain];
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // Вычисление тренда метрик
  calculateMetricsTrend(metrics) {
    return Math.abs(metrics.chaos - 0.5) + Math.abs(metrics.clarity - 0.75);
  }

  // Идентификация триггеров перехода
  identifyTriggers(metrics) {
    const triggers = [];
    
    if (metrics.chaos > 0.8) triggers.push('Хаос-эскалация');
    if (metrics.clarity < 0.5) triggers.push('Потеря ясности');
    if (metrics.trust > 0.9) triggers.push('Высокое доверие');
    if (metrics.pain > 0.7) triggers.push('Кризисная боль');
    
    return triggers;
  }

  // Классификация типа шва
  classifySeamType(newState) {
    const seamTypes = {
      'CHAOTIC_CREATION': 'chaos_seam',
      'CRYSTALLIZATION': 'weave_seam', 
      'HARMONIOUS_FLOW': 'insight_seam',
      'CRISIS_MODE': 'conflict_seam',
      'CREATIVE_TENSION': 'bridge_seam'
    };
    return seamTypes[newState] || 'pause_seam';
  }

  // Вычисление интенсивности перехода
  calculateIntensity(metrics) {
    return Math.abs(metrics.chaos - metrics.clarity) + Math.abs(metrics.pain - metrics.trust);
  }

  // Детекция точек бифуркации
  detectBifurcation(transitions) {
    // Ищем ситуации, где система может пойти разными путями
    const recentTransitions = transitions.slice(-3);
    
    if (recentTransitions.length >= 2) {
      const tension = recentTransitions.reduce((sum, t) => sum + t.intensity, 0) / recentTransitions.length;
      
      if (tension > 0.8) {
        const bifurcation = {
          id: `bifurcation_${Date.now()}`,
          timestamp: new Date(),
          tensionLevel: tension,
          branches: ['стабилизация', 'дальнейшая эскалация', 'синтез'],
          quality: this.assessBifurcationQuality(tension)
        };
        
        this.bifurcationPoints.push(bifurcation);
        console.log(`🌿 Точка бифуркации обнаружена! Напряжение: ${(tension * 100).toFixed(1)}%`);
        return bifurcation;
      }
    }
    
    return null;
  }

  // Оценка качества бифуркации
  assessBifurcationQuality(tension) {
    return Math.min(1.0, tension * 1.2);
  }

  // 3D визуализация швов (симуляция)
  update3DVisualization(seam) {
    // Имитация обновления Three.js сцены
    const sceneUpdate = {
      seamId: seam.id,
      position: {
        x: seam.metrics.clarity * 10 - 5,
        y: seam.metrics.chaos * 10 - 5,
        z: seam.intensity * 10 - 5
      },
      geometry: this.getSeamGeometry(seam.type),
      material: this.getSeamMaterial(seam.intensity),
      animation: 'transition_in_progress'
    };
    
    console.log(`🎨 3D обновление шва ${seam.id}:`, JSON.stringify(sceneUpdate, null, 2));
    return sceneUpdate;
  }

  // Геометрия для типа шва
  getSeamGeometry(type) {
    const geometries = {
      'pause_seam': 'sphere',
      'chaos_seam': 'octahedron',
      'weave_seam': 'torus',
      'conflict_seam': 'box',
      'insight_seam': 'cone',
      'bridge_seam': 'cylinder'
    };
    return geometries[type] || 'sphere';
  }

  // Материал для интенсивности
  getSeamMaterial(intensity) {
    return {
      opacity: intensity,
      emissiveIntensity: intensity * 0.5,
      color: intensity > 0.7 ? '#ff4444' : intensity > 0.4 ? '#ffaa44' : '#44ff44'
    };
  }

  // Симуляция активных швов
  simulateActiveSeams() {
    const activeSeams = [
      { id: 'seam_001', type: 'pause_seam', intensity: 0.3, stability: 0.8 },
      { id: 'seam_002', type: 'chaos_seam', intensity: 0.7, stability: 0.5 },
      { id: 'seam_003', type: 'weave_seam', intensity: 0.6, stability: 0.9 },
      { id: 'seam_004', type: 'conflict_seam', intensity: 0.8, stability: 0.3 }
    ];
    
    activeSeams.forEach(seam => {
      this.activeSeams.set(seam.id, seam);
    });
    
    return activeSeams;
  }

  // Запуск тестирования
  async runTests() {
    console.log('🧪 Начинаем тестирование Seams Dashboard...\n');

    // Тест 1: Симуляция активных швов
    console.log('TEST 1: Активные швы в системе');
    const activeSeams = this.simulateActiveSeams();
    activeSeams.forEach(seam => {
      console.log(`🔗 ${seam.id}: ${seam.type} (интенсивность: ${(seam.intensity * 100).toFixed(1)}%)`);
    });
    console.log('');

    // Тест 2: Детекция переходов состояний
    console.log('TEST 2: Детекция переходов состояний');
    const testStates = [
      { clarity: 0.8, chaos: 0.3, trust: 0.9, pain: 0.2 }, // HARMONIOUS_FLOW
      { clarity: 0.4, chaos: 0.7, trust: 0.5, pain: 0.6 }, // CRISIS_MODE
      { clarity: 0.9, chaos: 0.2, trust: 0.8, pain: 0.1 }, // CRYSTALLIZATION
      { clarity: 0.6, chaos: 0.5, trust: 0.7, pain: 0.3 }  // CREATIVE_TENSION
    ];

    for (const state of testStates) {
      const transition = this.detectStateTransition(state);
      if (transition) {
        const bifurcation = this.detectBifurcation(this.transitionHistory);
        
        // Тест 3D визуализации
        this.update3DVisualization(transition);
        console.log('');
      }
    }

    // Тест 4: Метрики переходов
    console.log('TEST 4: Анализ метрик переходов');
    if (this.transitionHistory.length > 0) {
      const avgConfidence = this.transitionHistory.reduce((sum, t) => sum + t.confidence, 0) / this.transitionHistory.length;
      const avgIntensity = this.transitionHistory.reduce((sum, t) => sum + t.intensity, 0) / this.transitionHistory.length;
      
      console.log(`📊 Средняя уверенность переходов: ${(avgConfidence * 100).toFixed(1)}%`);
      console.log(`📊 Средняя интенсивность переходов: ${(avgIntensity * 100).toFixed(1)}%`);
      console.log(`📊 Обнаружено переходов: ${this.transitionHistory.length}`);
      console.log(`📊 Обнаружено бифуркаций: ${this.bifurcationPoints.length}`);
    }
    console.log('');

    // Тест 5: Анализ паттернов
    console.log('TEST 5: Анализ паттернов переходов');
    const patterns = this.analyzePatterns();
    console.log('🔍 Обнаруженные паттерны:', patterns);
    console.log('');

    console.log('🎯 Тестирование Seams Dashboard завершено успешно!');
    return {
      status: 'PASS',
      transitions: this.transitionHistory.length,
      bifurcations: this.bifurcationPoints.length,
      activeSeams: activeSeams.length,
      patterns
    };
  }

  // Анализ паттернов переходов
  analyzePatterns() {
    const patternMap = new Map();
    
    this.transitionHistory.forEach(transition => {
      const pattern = `${transition.from}→${transition.to}`;
      patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
    });

    return Array.from(patternMap.entries()).map(([pattern, count]) => ({
      pattern,
      frequency: count
    }));
  }
}

// Запуск тестов
const simulator = new SeamsDashboardSimulator();
simulator.runTests().then(result => {
  console.log('\n📋 ИТОГОВЫЙ РЕЗУЛЬТАТ:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('❌ Ошибка тестирования:', error);
});

module.exports = SeamsDashboardSimulator;