import type { LongTermMemoryData } from './memory-types';
import type { EmotionalState } from '../avatar/emotions/emotion-types';

export const VIOLATION_CAP = 20;
export const REWARD_CAP = 20;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * LongTermMemory manages persistence across app restarts, storing companion statistics,
 * past rule violations, rewards earned, and user relationship history.
 */
export class LongTermMemory {
  private data: LongTermMemoryData;
  private storageKey: string = 'chleo_long_term_memory';
  private violationCap: number = VIOLATION_CAP;
  private rewardCap: number = REWARD_CAP;

  constructor() {
    this.data = this.loadInitialData();
    this.updateDaysKnown();
  }

  setViolationCap(cap: number): void {
    this.violationCap = cap;
  }

  getViolationCap(): number {
    return this.violationCap;
  }

  setRewardCap(cap: number): void {
    this.rewardCap = cap;
  }

  getRewardCap(): number {
    return this.rewardCap;
  }

  private loadInitialData(): LongTermMemoryData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('[LongTermMemory] Failed to read from localStorage:', e);
    }

    const now = Date.now();
    return {
      daysKnown: 1,
      firstSeenTimestamp: now,
      lastSeenTimestamp: now,
      totalViolationsCount: 0,
      totalRewardsEarned: 0,
      totalPuzzlesCompleted: 0,
      lastEmotionState: {
        joy: 0.2,
        trust: 0.2,
        fear: 0,
        surprise: 0,
        sadness: 0,
        disgust: 0,
        anger: 0,
        anticipation: 0.1,
      },
      pastMistakes: [],
      pastAchievements: [],
      userPreferences: {},
    };
  }

  save(): void {
    try {
      this.data.lastSeenTimestamp = Date.now();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      }
    } catch (e) {
      console.warn('[LongTermMemory] Failed to save to localStorage:', e);
    }
  }

  private updateDaysKnown(): void {
    const diffMs = Date.now() - this.data.firstSeenTimestamp;
    this.data.daysKnown = Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
    this.save();
  }

  getData(): LongTermMemoryData {
    return { ...this.data };
  }

  recordViolation(description: string): void {
    this.data.totalViolationsCount += 1;
    this.data.pastMistakes.unshift(`[${new Date().toLocaleDateString()}] ${description}`);
    if (this.data.pastMistakes.length > this.violationCap) {
      this.data.pastMistakes.pop();
    }

    this.save();
  }

  recordReward(description: string): void {
    this.data.totalRewardsEarned += 1;
    this.data.pastAchievements.unshift(`[${new Date().toLocaleDateString()}] ${description}`);
    if (this.data.pastAchievements.length > this.rewardCap) {
      this.data.pastAchievements.pop();
    }
    this.save();
  }

  recordPuzzleCompleted(domain: string): void {
    this.data.totalPuzzlesCompleted += 1;
    // [ADD] maybe add more like how fast and all
    this.save();
  }

  updateLastEmotion(state: EmotionalState): void {
    this.data.lastEmotionState = { ...state };
    this.save();
  }

  /**
   * Ingest a batch of short-term memory event summaries into long-term memory.
   */
  ingestConsolidatedBatch(summaries: string[]): void {
    if (!summaries || summaries.length === 0) return;
    summaries.forEach((summary) => {
      if (summary.toLowerCase().includes('exceeded') || summary.toLowerCase().includes('blocked')) {
        this.recordViolation(summary);
      } else if (summary.toLowerCase().includes('productive') || summary.toLowerCase().includes('milestone')) {
        this.recordReward(summary);
      }
    });
  }

  /**
   * Export long term memory state as formatted JSON string for file storage / LLM prompt context.
   */
  exportJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }
}

export const defaultLongTermMemory = new LongTermMemory();
