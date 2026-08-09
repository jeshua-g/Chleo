import type { SiteRule, SiteType, MonitoringConfig, MonitoringEventPayload, TickResult } from './monitoring-types';
import { BehavioralEngine } from './behavioral-engine';
import defaultActivityRules from './config/activity-rules.json';

/**
 * RuleStore manages site rules only: reading, writing, and updating domain rules
 * at runtime. Delegates behavioral reactions to BehavioralEngine.
 */
//[ADD] rules should be saved and loaded for persistence
export class RuleStore {
  private activityConfig: MonitoringConfig;
  private behavioralEngine: BehavioralEngine;
  private storageKeyActivity = 'chleo_activity_rules_v1';
  private cumulativeProductiveSeconds: number = 0;

  constructor(behavioralEngine: BehavioralEngine) {
    this.behavioralEngine = behavioralEngine;
    this.activityConfig = this.loadActivityConfig();
  }

  private loadActivityConfig(): MonitoringConfig {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKeyActivity);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[RuleStore] Failed to load activity rules from storage:', e);
    }
    return JSON.parse(JSON.stringify(defaultActivityRules)) as MonitoringConfig;
  }

  saveActivityConfig(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKeyActivity, JSON.stringify(this.activityConfig));
      }
    } catch (e) {
      console.warn('[RuleStore] Failed to save activity rules:', e);
    }
  }

  // --- Site Rules Methods ---

  getSiteRules(): SiteRule[] {
    return this.activityConfig.rules;
  }

  findRuleForDomain(domain: string): SiteRule | undefined {
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    return this.activityConfig.rules.find((r) => {
      const cleanRuleDomain = r.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      return cleanDomain === cleanRuleDomain || cleanDomain.endsWith('.' + cleanRuleDomain);
    });
  }

  setBlockSite(domain: string, useThisRule?: SiteRule): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: 'blocked',
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: true,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = 'blocked';
      rule.requiresPuzzleToUnblock = true;
    }
    this.saveActivityConfig();
    return rule;
  }

  setUnblockSite(domain: string, useThisRule?: SiteRule): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: 'neutral',
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = 'neutral';
      rule.requiresPuzzleToUnblock = false;
    }
    this.saveActivityConfig();
    return rule;
  }

  setSiteLimit(domain: string, dailyLimitSeconds: number, useThisRule?: SiteRule): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: 'avoid',
        dailyLimitSeconds,
        spentTodaySeconds: 0,
        warningThresholdPercent: 75,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = 'avoid';
      rule.dailyLimitSeconds = dailyLimitSeconds;
      rule.spentTodaySeconds = 0; // reset for new limit testing
    }
    this.saveActivityConfig();
    return rule;
  }

  setSiteProductive(domain: string, isProductive: boolean, useThisRule?: SiteRule): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: isProductive ? 'productive' : 'neutral',
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = isProductive ? 'productive' : 'neutral';
    }
    this.saveActivityConfig();
    return rule;
  }

  updateSpentTime(domain: string, deltaSeconds: number, useThisRule?: SiteRule): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: 'neutral',
        dailyLimitSeconds: 0,
        spentTodaySeconds: deltaSeconds,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.spentTodaySeconds += deltaSeconds;
    }

    this.saveActivityConfig();
    return rule;
  }

  getProductiveRewardIntervalSeconds(): number {
    return this.activityConfig.productiveRewardIntervalSeconds;
  }

  setProductiveRewardIntervalSeconds(seconds: number): void {
    this.activityConfig.productiveRewardIntervalSeconds = seconds;
    this.saveActivityConfig();
  }

  // --- Tick Evaluation (moved from ActivityTracker.onTick) ---

  /**
   * Evaluate a single tick for the given domain. Handles rule lookup,
   * time increment, warning/exceeded/milestone checks, and behavioral reactions.
   */
  evaluateTick(domain: string, deltaSeconds: number, isWarningActive: (d: string) => boolean, setWarning: (d: string, percent: number) => void): TickResult {
    let rule = this.findRuleForDomain(domain);

    // Blocked: don't increment time
    if (rule && rule.type === 'blocked') {
      return {
        domain,
        spentTodaySeconds: rule.spentTodaySeconds,
        isBlocked: true,
        ruleChanged: false,
      };
    }

    // Increment spent time
    rule = this.updateSpentTime(domain, deltaSeconds, rule);

    if (!rule) {
      return { domain, spentTodaySeconds: 0, isBlocked: false, ruleChanged: false };
    }

    // Avoid: check warning/exceeded
    if (rule.type === 'avoid' && rule.dailyLimitSeconds > 0) {
      const spent = rule.spentTodaySeconds;
      const limit = rule.dailyLimitSeconds;
      const percent = (spent / limit) * 100;
      const remaining = Math.max(0, limit - spent);

      // Exceeded
      if (spent >= limit) {
        rule = this.setBlockSite(domain, rule);

        const payload: MonitoringEventPayload = {
          eventId: 'LIMIT_EXCEEDED',
          domain,
          timeSpentSeconds: spent,
          limitSeconds: limit,
          percentSpent: 100,
          remainingSeconds: 0,
          siteType: 'blocked',
        };

        const result = this.behavioralEngine.processEvent(payload);
        return {
          domain,
          spentTodaySeconds: spent,
          isBlocked: true,
          ruleChanged: true,
          reaction: result ? { payload, speechText: result.speechText } : undefined,
        };
      }

      // Warning threshold
      if (percent >= rule.warningThresholdPercent && !isWarningActive(domain)) {
        setWarning(domain, percent);

        const payload: MonitoringEventPayload = {
          eventId: 'LIMIT_WARNING',
          domain,
          timeSpentSeconds: spent,
          limitSeconds: limit,
          percentSpent: remaining,
          remainingSeconds: remaining,
          siteType: 'avoid',
        };

        const result = this.behavioralEngine.processEvent(payload);
        return {
          domain,
          spentTodaySeconds: spent,
          isBlocked: false,
          ruleChanged: false,
          reaction: result ? { payload, speechText: result.speechText } : undefined,
        };
      }
    }

    // Productive: check milestone
    if (rule.type === 'productive') {
      this.cumulativeProductiveSeconds += deltaSeconds;
      const rewardInterval = this.getProductiveRewardIntervalSeconds();

      if (this.cumulativeProductiveSeconds > 0 &&
        this.cumulativeProductiveSeconds % rewardInterval === 0) {
        const payload: MonitoringEventPayload = {
          eventId: 'PRODUCTIVE_MILESTONE',
          domain,
          timeSpentSeconds: this.cumulativeProductiveSeconds,
          limitSeconds: rewardInterval,
          percentSpent: 100,
          remainingSeconds: 0,
          siteType: 'productive',
        };

        const result = this.behavioralEngine.processEvent(payload);
        return {
          domain,
          spentTodaySeconds: rule.spentTodaySeconds,
          isBlocked: false,
          ruleChanged: false,
          reaction: result ? { payload, speechText: result.speechText } : undefined,
        };
      }
    }

    return {
      domain,
      spentTodaySeconds: rule.spentTodaySeconds,
      isBlocked: false,
      ruleChanged: false,
    };
  }

  /**
   * Evaluate a site visit (used by handleSiteVisit).
   */
  evaluateVisit(domain: string): TickResult {
    const rule = this.findRuleForDomain(domain);

    if (rule && rule.type === 'blocked') {
      const payload: MonitoringEventPayload = {
        eventId: 'SITE_BLOCKED_VISIT',
        domain,
        timeSpentSeconds: rule.spentTodaySeconds,
        limitSeconds: rule.dailyLimitSeconds,
        percentSpent: 100,
        remainingSeconds: 0,
        siteType: 'blocked',
      };

      const result = this.behavioralEngine.processEvent(payload);
      return {
        domain,
        spentTodaySeconds: rule.spentTodaySeconds,
        isBlocked: true,
        ruleChanged: false,
        reaction: result ? { payload, speechText: result.speechText } : undefined,
      };
    }

    return { domain, spentTodaySeconds: rule?.spentTodaySeconds || 0, isBlocked: false, ruleChanged: false };
  }

  /**
   * Evaluate puzzle unblock (used by completePuzzleAndUnblock).
   */
  evaluatePuzzleUnblock(domain: string): TickResult {
    const rule = this.setUnblockSite(domain);

    const payload: MonitoringEventPayload = {
      eventId: 'PUZZLE_UNBLOCK_PENALTY',
      domain,
      timeSpentSeconds: rule.spentTodaySeconds,
      limitSeconds: rule.dailyLimitSeconds,
      percentSpent: 0,
      remainingSeconds: 0,
      siteType: 'neutral',
    };

    const result = this.behavioralEngine.processEvent(payload);
    return {
      domain,
      spentTodaySeconds: rule.spentTodaySeconds,
      isBlocked: false,
      ruleChanged: true,
      reaction: result ? { payload, speechText: result.speechText } : undefined,
    };
  }

  /**
   * Trigger day-change consolidation through the behavioral engine's chain.
   */
  triggerDayChangeConsolidation(): void {
    // Reach into the chain: BehavioralEngine → ResponseGenerator → ShortTermMemory → LTM
    // For now, we expose this as a pass-through. The ShortTermMemory handles consolidation internally.
    // This is called by ActivityTracker when a date change is detected.
    console.log('[RuleStore] Day change consolidation triggered via chain');
  }

  getBehavioralEngine(): BehavioralEngine {
    return this.behavioralEngine;
  }

  resetAllRules(): void {
    this.activityConfig = JSON.parse(JSON.stringify(defaultActivityRules));
    this.saveActivityConfig();
    this.behavioralEngine.resetBehavioralRules();
  }
}
