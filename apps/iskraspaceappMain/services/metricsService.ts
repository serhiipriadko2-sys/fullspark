
import { IskraMetrics, IskraPhase, MetaMetrics } from '../types';
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
   * Calculate meta-metrics (CD-Index, Fractality, A-Index)
   * @see legacy/IskraSAprototype/iskra_engine.ts:397-422
   * @see canon/IskraCanonDocumentation/05_METRICS_and_RHYTHM_INDEX.md
   */
  public calculateMetaMetrics(m: IskraMetrics): MetaMetrics {
    // Law-47: Fractality = Integrity × Resonance
    const integrity = (m.trust + m.clarity) / 2;
    const resonance = (m.mirror_sync + (1 - m.drift)) / 2;
    const fractality = integrity * resonance * 2.0; // ×2.0 для нормализации к 0-2 range

    // A-Index: Integrative Health
    // Weighted combination: trust (30%), clarity (40%), mirror_sync (30%), penalty from pain
    const a_index = (m.trust * 0.3 + m.clarity * 0.4 + m.mirror_sync * 0.3) * (1 - m.pain * 0.5);

    // CD-Index components (Composite Desiderata):
    // Groundedness: ясность минус дрейф
    const groundedness = m.clarity * (1 - m.drift);

    // Truthfulness: напрямую trust
    const truthfulness = m.trust;

    // Helpfulness: синхронизация с пользователем
    const helpfulness = m.mirror_sync;

    // Resolution: способность разрешать (низкая боль + низкий хаос)
    const resolution = (1 - m.pain) * (1 - m.chaos);

    // Civility: вежливость и доверие
    const civility = m.trust;

    // CD-Index: average of all 5 components
    const cd_index = (groundedness + truthfulness + helpfulness + resolution + civility) / 5;

    return {
      a_index: parseFloat(a_index.toFixed(2)),
      cd_index: parseFloat(cd_index.toFixed(2)),
      fractality: parseFloat(fractality.toFixed(2)),
      groundedness: parseFloat(groundedness.toFixed(2)),
      truthfulness: parseFloat(truthfulness.toFixed(2)),
      helpfulness: parseFloat(helpfulness.toFixed(2)),
      resolution: parseFloat(resolution.toFixed(2)),
      civility: parseFloat(civility.toFixed(2))
    };
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
