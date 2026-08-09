import { RuleStore } from './rule-store';
import { ShortTermMemory } from '../memory/short-term-memory';
import { parseMonitoringCommand, ParsedCommand } from './command-parser';
import type { MonitoringEventPayload, SiteRule, TickResult } from './monitoring-types';

export interface ActivityTrackerListeners {
  onEventTriggered?: (payload: MonitoringEventPayload, speechText: string) => void;
  onRuleChanged?: () => void;
  onTick?: (activeDomain: string, spentTodaySeconds: number) => void;
}

/**
 * ActivityTracker manages the 1-second tick loop, domain tracking,
 * and date-change detection. Talks only to RuleStore.
 */
export class ActivityTracker {
  private ruleStore: RuleStore;
  private shortTermMemory: ShortTermMemory;
  private listeners: ActivityTrackerListeners;

  private tickerInterval: number | null = null;
  private activeDomain: string = 'localhost';
  private lastCheckedDate: string = new Date().toDateString();

  constructor(
    ruleStore: RuleStore,
    shortTermMemory: ShortTermMemory,
    listeners: ActivityTrackerListeners = {}
  ) {
    this.ruleStore = ruleStore;
    this.shortTermMemory = shortTermMemory;
    this.listeners = listeners;

    this.startTicker();
  }

  /**
   * Start 1-second monitoring tick loop.
   */
  startTicker(): void {
    if (this.tickerInterval !== null) return;

    this.tickerInterval = window.setInterval(() => {
      this.onTick();
    }, 1000);
  }

  stopTicker(): void {
    if (this.tickerInterval !== null) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  /**
   * Main 1-second tick loop evaluation.
   * Only interacts with RuleStore — all behavioral/memory logic is handled downstream.
   */
  private async onTick(): Promise<void> {
    if (!this.activeDomain) return;

    // Check end-of-day date change for memory consolidation
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastCheckedDate) {
      this.lastCheckedDate = currentDate;
      this.shortTermMemory.consolidateToLongTermMemory('day_change');
    }

    const result: TickResult = await this.ruleStore.evaluateTick(
      this.activeDomain,
      1,
      (d) => this.shortTermMemory.isWarningActive(d),
      (d, p) => this.shortTermMemory.setWarning(d, p)
    );

    if (this.listeners.onTick) {
      this.listeners.onTick(result.domain, result.spentTodaySeconds);
    }

    if (result.reaction && this.listeners.onEventTriggered) {
      this.listeners.onEventTriggered(result.reaction.payload, result.reaction.speechText);
    }

    if (result.ruleChanged && this.listeners.onRuleChanged) {
      this.listeners.onRuleChanged();
    }
  }

  /**
   * Handle website visitation event from Chrome Extension or Simulator.
   */
  async handleSiteVisit(url: string, title?: string): Promise<{ isBlocked: boolean; speechText?: string }> {
    let domain = url;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        domain = new URL(url).hostname;
      }
    } catch (_) { }

    this.activeDomain = domain;
    this.shortTermMemory.setActiveDomain(domain);

    const result = await this.ruleStore.evaluateVisit(domain);

    if (result.isBlocked) {
      if (result.reaction && this.listeners.onEventTriggered) {
        this.listeners.onEventTriggered(result.reaction.payload, result.reaction.speechText);
      }
      return { isBlocked: true, speechText: result.reaction?.speechText };
    }

    return { isBlocked: false };
  }

  /**
   * Execute unblock puzzle finish action.
   * Unblocks website but applies anger and sadness penalty to Chleo!
   */
  async completePuzzleAndUnblock(domain: string): Promise<{ rule: SiteRule; speechText: string }> {
    const result = await this.ruleStore.evaluatePuzzleUnblock(domain);
    const rule = this.ruleStore.findRuleForDomain(domain)!;

    if (result.reaction && this.listeners.onEventTriggered) {
      this.listeners.onEventTriggered(result.reaction.payload, result.reaction.speechText);
    }
    if (this.listeners.onRuleChanged) this.listeners.onRuleChanged();

    return { rule, speechText: result.reaction?.speechText || `Unblocked ${domain}` };
  }

  /**
   * Process natural language text commands (e.g. "block facebook.com", "limit youtube.com to 1 min").
   */
  processCommand(textCommand: string): { parsed: ParsedCommand; responseText: string } {
    const parsed = parseMonitoringCommand(textCommand);
    let responseText = '';

    switch (parsed.action) {
      case 'BLOCK': {
        if (parsed.domain) {
          this.ruleStore.setBlockSite(parsed.domain);
          responseText = `Okay, I have completely blocked ${parsed.domain}!`;
        }
        break;
      }

      case 'UNBLOCK': {
        if (parsed.domain) {
          // Unblocking triggers puzzle requirement notice
          responseText = `To unblock ${parsed.domain}, you must finish my puzzle challenge! Click the puzzle unblock button below.`;
        }
        break;
      }

      case 'LIMIT': {
        if (parsed.domain && parsed.seconds) {
          this.ruleStore.setSiteLimit(parsed.domain, parsed.seconds);
          const formatted = parsed.seconds >= 60 ? `${Math.round(parsed.seconds / 60)} minutes` : `${parsed.seconds} seconds`;
          responseText = `Got it! Set a daily limit of ${formatted} for ${parsed.domain}.`;
        }
        break;
      }

      case 'MARK_PRODUCTIVE': {
        if (parsed.domain) {
          this.ruleStore.setSiteProductive(parsed.domain, true);
          responseText = `Marked ${parsed.domain} as productive! You will earn rewards for staying focused there.`;
        }
        break;
      }

      case 'UNMARK_PRODUCTIVE': {
        if (parsed.domain) {
          this.ruleStore.setSiteProductive(parsed.domain, false);
          responseText = `Removed ${parsed.domain} from productive sites.`;
        }
        break;
      }

      default: {
        responseText = `I didn't understand that monitoring command. Try: 'block twitter.com', 'limit youtube.com to 1 minute', or 'mark github.com productive'.`;
      }
    }

    if (this.listeners.onRuleChanged) this.listeners.onRuleChanged();

    return { parsed, responseText };
  }

  getEmotionState() {
    return this.ruleStore.getBehavioralEngine().getEmotionState();
  }

  getOverallEmotion() {
    return this.ruleStore.getBehavioralEngine().getOverallEmotion();
  }
}
