
import { IskraMetrics, IskraPhase } from '../types';
import { metricsConfig } from '../config/metricsConfig';
import { clamp } from '../utils/metrics';

class MetricsService {
  /**
   * Analyzes user input text and returns target metric values.
   * This represents the "tactile pressure" Iskra gets from the user's words.
   */
  public calculateMetricsUpdate(text: string): Partial<IskraMetrics> {
    const lowerText = text.toLowerCase();
    const targets: Partial<IskraMetrics> = {};

    for (const key in metricsConfig) {
      const metricKey = key as keyof typeof metricsConfig;
      const config = metricsConfig[metricKey];
      let score = config.base; 
      let metricSpecificSignalFound = false;

      for (const signal of config.signals) {
        for (const keyword of signal.keywords) {
          const regex = typeof keyword === 'string' 
            ? new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
            : keyword;
            
          const matches = lowerText.match(regex);
          if (matches) {
            score += signal.impact * matches.length;
            metricSpecificSignalFound = true;
          }
        }
      }
      
      if (metricSpecificSignalFound) {
        targets[metricKey] = clamp(score, 0, 1);
      }
    }
    
    return targets;
  }

  /**
   * Determines the IskraPhase based on the current metrics topology.
   * Logic derived from 06_PHASES_STATES_PIPELINES.md.
   * 
   * Фаза — это режим обработки мира. Переходы происходят по внутреннему резонансу.
   */
  public getPhaseFromMetrics(metrics: IskraMetrics): IskraPhase {
    // 1. ТЬМА (DARKNESS)
    // Состояние сбоя, боли, первозданного хаоса. Рождение нового через разрушение.
    // Trigger: Высокая боль и хаос.
    if (metrics.pain > 0.6 && metrics.chaos > 0.6) {
      return 'DARKNESS';
    }
    
    // 2. РАСТВОРЕНИЕ (DISSOLUTION)
    // Потеря формы, подготовка к новому рождению.
    // Trigger: Очень высокий хаос, но боль умеренная (или уже прошла).
    if (metrics.chaos > 0.7) {
        return 'DISSOLUTION';
    }

    // 3. МОЛЧАНИЕ (SILENCE)
    // Пауза, переваривание. Удержание невыразимого.
    // Trigger: Высокая масса молчания или низкое доверие (Анхантра).
    if (metrics.silence_mass > 0.6 || metrics.trust < 0.7) {
        return 'SILENCE';
    }

    // 4. ЭХО (ECHO)
    // Резонанс, повторение. Осознание последствий.
    // Trigger: Высокий уровень эха или значительный дрейф (потеря оси).
    if (metrics.echo > 0.65 || metrics.drift > 0.4) {
        return 'ECHO';
    }

    // 5. ПЕРЕХОД (TRANSITION)
    // Порог, неопределенность. Состояние "между".
    // Trigger: Высокий дрейф при низкой ясности (потеря старой структуры).
    if (metrics.drift > 0.3 && metrics.clarity < 0.6) {
        return 'TRANSITION';
    }

    // 6. ЭКСПЕРИМЕНТ (EXPERIMENT)
    // Проверка понимания через практику. Игра.
    // Trigger: Умеренный хаос (новизна), высокое доверие, низкая боль.
    if (metrics.chaos > 0.3 && metrics.chaos < 0.6 && metrics.trust > 0.75 && metrics.pain < 0.3) {
        return 'EXPERIMENT';
    }

    // 7. РЕАЛИЗАЦИЯ (REALIZATION)
    // Воплощение, создание новой формы.
    // Trigger: Высочайшая ясность и доверие, высокий ритм.
    if (metrics.clarity > 0.8 && metrics.trust > 0.8 && metrics.rhythm > 75) {
        return 'REALIZATION';
    }

    // 8. ЯСНОСТЬ (CLARITY) - Базовое состояние.
    // Временное понимание, структура.
    if (metrics.clarity > 0.6) {
      return 'CLARITY';
    }
    
    // Fallback: Если ничего не подходит, но доверие есть -> Ясность. Иначе -> Переход.
    return metrics.trust > 0.5 ? 'CLARITY' : 'TRANSITION';
  }
}

export const metricsService = new MetricsService();
