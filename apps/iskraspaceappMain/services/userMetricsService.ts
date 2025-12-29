/**
 * USER METRICS SERVICE — Расчёт пользовательских метрик дня
 *
 * Этот сервис вычисляет UserDailyMetrics (метрики ПОЛЬЗОВАТЕЛЯ),
 * которые формируют ∆-Ритм на главном экране.
 *
 * ВАЖНО: Это НЕ IskraMetrics (метрики AI-companion)!
 *
 * Источники данных:
 * - focus: Накопленное время фокус-сессий за день
 * - sleep: Ввод пользователя (TODO: HealthKit интеграция)
 * - energy: Последняя самооценка из журнала
 * - habits: Процент выполненных привычек за день
 *
 * @see types.ts - UserDailyMetrics
 * @see components/DayPulse.tsx - отображение ∆-Ритма
 */

import { UserDailyMetrics, Habit, JournalEntry } from '../types';
import { storageService } from './storageService';
import { safeStorage } from './storageCompat';

// Веса для расчёта ∆-Ритма (сумма = 1.0)
const DELTA_WEIGHTS = {
  focus: 0.25,   // Фокус важен, но не доминирует
  sleep: 0.30,   // Сон — основа всего
  energy: 0.20,  // Субъективная энергия
  habits: 0.25,  // Привычки формируют ритм
};

// localStorage ключи для хранения пользовательских метрик
const STORAGE_KEYS = {
  FOCUS_MINUTES_TODAY: 'iskra_focus_minutes_today',
  FOCUS_DATE: 'iskra_focus_date',
  SLEEP_SCORE: 'iskra_sleep_score',
  SLEEP_DATE: 'iskra_sleep_date',
};

class UserMetricsService {
  /**
   * Получить все пользовательские метрики дня
   */
  getUserDailyMetrics(): UserDailyMetrics {
    const focus = this.getFocusScore();
    const sleep = this.getSleepScore();
    const energy = this.getEnergyScore();
    const habits = this.getHabitsScore();

    const deltaScore = this.calculateDeltaScore(focus, sleep, energy, habits);

    return {
      focus,
      sleep,
      energy,
      habits,
      deltaScore,
    };
  }

  /**
   * Расчёт ∆-Ритма из 4 компонентов
   */
  private calculateDeltaScore(
    focus: number,
    sleep: number,
    energy: number,
    habits: number
  ): number {
    const weighted =
      focus * DELTA_WEIGHTS.focus +
      sleep * DELTA_WEIGHTS.sleep +
      energy * DELTA_WEIGHTS.energy +
      habits * DELTA_WEIGHTS.habits;

    return Math.round(Math.min(100, Math.max(0, weighted)));
  }

  /**
   * Фокус: на основе накопленных минут фокус-сессий
   * Цель: 90 минут глубокого фокуса = 100%
   */
  getFocusScore(): number {
    const today = this.getTodayString();
    const storedDate = safeStorage.getItem(STORAGE_KEYS.FOCUS_DATE);

    // Если дата не сегодня, сбрасываем
    if (storedDate !== today) {
      safeStorage.setItem(STORAGE_KEYS.FOCUS_MINUTES_TODAY, '0');
      safeStorage.setItem(STORAGE_KEYS.FOCUS_DATE, today);
      return 0;
    }

    const minutes = parseInt(safeStorage.getItem(STORAGE_KEYS.FOCUS_MINUTES_TODAY) || '0', 10);
    // 90 минут = 100%
    const TARGET_FOCUS_MINUTES = 90;
    return Math.min(100, Math.round((minutes / TARGET_FOCUS_MINUTES) * 100));
  }

  /**
   * Добавить минуты фокуса (вызывается из FocusSession)
   */
  addFocusMinutes(minutes: number): void {
    const today = this.getTodayString();
    const storedDate = safeStorage.getItem(STORAGE_KEYS.FOCUS_DATE);

    if (storedDate !== today) {
      safeStorage.setItem(STORAGE_KEYS.FOCUS_MINUTES_TODAY, '0');
      safeStorage.setItem(STORAGE_KEYS.FOCUS_DATE, today);
    }

    const current = parseInt(safeStorage.getItem(STORAGE_KEYS.FOCUS_MINUTES_TODAY) || '0', 10);
    safeStorage.setItem(STORAGE_KEYS.FOCUS_MINUTES_TODAY, String(current + minutes));
  }

  /**
   * Сон: пользовательский ввод (0-100)
   * TODO: Интеграция с HealthKit/Health Connect
   */
  getSleepScore(): number {
    const today = this.getTodayString();
    const storedDate = safeStorage.getItem(STORAGE_KEYS.SLEEP_DATE);

    if (storedDate !== today) {
      // Если нет данных за сегодня, возвращаем нейтральное значение
      return 70; // Базовое значение "нормальный сон"
    }

    const score = parseInt(safeStorage.getItem(STORAGE_KEYS.SLEEP_SCORE) || '70', 10);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Установить оценку сна (вызывается из UI)
   */
  setSleepScore(score: number): void {
    const today = this.getTodayString();
    safeStorage.setItem(STORAGE_KEYS.SLEEP_SCORE, String(Math.min(100, Math.max(0, score))));
    safeStorage.setItem(STORAGE_KEYS.SLEEP_DATE, today);
  }

  /**
   * Энергия: из последней записи в журнале за сегодня
   * Fallback: нейтральное значение 60
   */
  getEnergyScore(): number {
    try {
      const entries = storageService.getJournalEntries();
      const today = this.getTodayString();

      // Находим последнюю запись за сегодня с userMetrics
      const todayEntries = entries
        .filter((e: JournalEntry) => e.timestamp.startsWith(today) && e.userMetrics?.energy !== undefined)
        .sort((a: JournalEntry, b: JournalEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (todayEntries.length > 0 && todayEntries[0].userMetrics) {
        return todayEntries[0].userMetrics.energy;
      }
    } catch (e) {
      console.warn('Failed to get energy from journal:', e);
    }

    return 60; // Нейтральное значение
  }

  /**
   * Привычки: процент выполненных за сегодня
   */
  getHabitsScore(): number {
    try {
      const habits = storageService.getHabits();

      if (habits.length === 0) {
        return 75; // Нет привычек = нейтральное значение
      }

      const completed = habits.filter((h: Habit) => h.completedToday).length;
      return Math.round((completed / habits.length) * 100);
    } catch (e) {
      console.warn('Failed to get habits:', e);
      return 75;
    }
  }

  /**
   * Получить строку сегодняшней даты (YYYY-MM-DD)
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

export const userMetricsService = new UserMetricsService();
