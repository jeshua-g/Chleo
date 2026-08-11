import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import {
  ContentHeader,
  ContentParagraph,
  ContentImage,
  ContentCallout,
  ContentToggle,
  ContentColumns,
  ContentDivider,
  ContentList,
  ContentCode,
  ContentQuote,
} from '../components/content-blocks';

import ICON_MOUTH from '../../assets/mouth.png';

interface FeatureDetailPageProps {
  featureId: string;
  featureTitle: string;
  featureIcon: string;
  onBack: () => void;
}

/**
 * Detail page for a specific feature module.
 * Renders composable content blocks based on the featureId.
 */
export const FeatureDetailPage: React.FC<FeatureDetailPageProps> = ({
  featureId,
  featureTitle,
  featureIcon,
  onBack,
}) => {
  return (
    <div className="app-layout">
      <Header activeTab="blog" />

      <main className="page-container">
        {/* Back navigation */}
        <button
          type="button"
          className="feature-detail-back-btn action-btn"
          onClick={onBack}
        >
          ← Back to Features
        </button>

        {/* Feature detail content area */}
        <div className="feature-detail-page panel-section panel-bg-discussions">
          {featureId === 'speech' ? (
            <SpeechFeatureContent icon={featureIcon} />
          ) : (
            <ComingSoonContent title={featureTitle} icon={featureIcon} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

/* =========================================================================
   Speech Feature — Sample Content Using All Block Types
   ========================================================================= */

const SpeechFeatureContent: React.FC<{ icon: string }> = ({ icon }) => (
  <div className="feature-detail-blocks">
    {/* Hero header */}
    <ContentHeader
      title="Speech System"
      subtitle="Nuanced and realistic speech animation powered by viseme mapping and phoneme analysis."
      icon={<img src={icon} alt="Speech" className="cb-header__icon-img" />}
      level={1}
    />

    <ContentDivider />

    {/* Lead intro */}
    <ContentParagraph variant="lead">
      CHLEO's speech system transforms text into lifelike mouth animations by mapping
      each spoken phoneme to a corresponding viseme — a visual representation of mouth
      shape. This creates the illusion of natural speech without requiring pre-recorded
      lip-sync data.
    </ContentParagraph>

    {/* Callout — how it works */}
    <ContentCallout variant="info">
      A <strong>viseme</strong> is a generic facial image that represents a particular
      speech sound. CHLEO uses 15 distinct visemes to cover the full range of English
      phonemes, blending between them for smooth transitions.
    </ContentCallout>

    <ContentDivider label="How It Works" />

    {/* Two-column overview */}
    <ContentColumns columns={2}>
      <div>
        <ContentHeader title="Phoneme Analysis" level={3} />
        <ContentParagraph>
          The input text is first broken down into individual phonemes using a
          dictionary-based lookup. Each word is decomposed into its constituent
          sounds, which are then queued for sequential playback.
        </ContentParagraph>
        <ContentList
          variant="numbered"
          items={[
            'Text input is tokenized into words',
            'Each word is looked up in the phoneme dictionary',
            'Unknown words fall back to rule-based estimation',
            'Phoneme sequence is generated with timing data',
          ]}
        />
      </div>
      <div>
        <ContentHeader title="Viseme Mapping" level={3} />
        <ContentParagraph>
          Once phonemes are extracted, each one is mapped to one of 15 viseme
          frames. The mapping table covers consonants, vowels, and diphthongs
          to ensure accurate mouth shapes for every sound.
        </ContentParagraph>
        <ContentList
          variant="bullet"
          items={[
            'AA, AH → Open mouth viseme',
            'B, M, P → Closed lips viseme',
            'F, V → Teeth-on-lip viseme',
            'TH, DH → Tongue-between-teeth viseme',
            'EE, IY → Wide smile viseme',
          ]}
        />
      </div>
    </ContentColumns>

    <ContentDivider label="Technical Details" />

    {/* Toggle sections for deep dives */}
    <ContentToggle title="📖 Viseme Frame Definitions">
      <ContentParagraph>
        Each viseme frame is a pixel-art sprite representing a specific mouth
        position. The frames are indexed 0–14 and stored in the character's
        sprite sheet. During playback, the engine swaps frames at the rate
        determined by the speech speed setting.
      </ContentParagraph>
      <ContentCode
        title="Viseme Frame Map"
        language="typescript"
        code={`const VISEME_MAP: Record<string, number> = {
  'SIL': 0,   // Silence — closed mouth
  'AA':  1,   // "father"
  'AH':  2,   // "but"
  'B':   3,   // "bat" — lips together
  'CH':  4,   // "chin"
  'D':   5,   // "dog"
  'EE':  6,   // "see" — wide
  'F':   7,   // "fox" — teeth on lip
  'K':   8,   // "kit"
  'N':   9,   // "nap"
  'OH': 10,   // "go" — rounded
  'R':  11,   // "red"
  'S':  12,   // "sun"
  'TH': 13,   // "think"
  'W':  14,   // "wow" — pursed
};`}
      />
    </ContentToggle>

    <ContentToggle title="⚙️ Speech Engine Configuration">
      <ContentParagraph>
        The speech engine exposes several tunable parameters that control the
        pace, smoothness, and behavior of the animation playback.
      </ContentParagraph>
      <ContentList
        variant="checklist"
        items={[
          'Speed — Controls how fast visemes transition (50ms – 200ms per frame)',
          'Smoothing — Enables interpolation between viseme frames',
          'Pause duration — How long to hold on silence markers',
          'Loop mode — Whether to repeat the last phrase continuously',
        ]}
      />
    </ContentToggle>

    <ContentToggle title="🔬 Word-to-Phoneme Pipeline">
      <ContentParagraph>
        Words that aren't found in the built-in dictionary go through a
        rule-based fallback system. This system applies English phonological
        rules to estimate the most likely pronunciation.
      </ContentParagraph>
      <ContentCode
        title="Fallback Example"
        language="typescript"
        code={`function estimatePhonemes(word: string): string[] {
  // Apply common English rules
  const rules = [
    { pattern: /tion$/, phonemes: ['SH', 'AH', 'N'] },
    { pattern: /ing$/,  phonemes: ['IH', 'NG'] },
    { pattern: /ght$/,  phonemes: ['T'] },
  ];
  // ... rule matching logic
  return matchedPhonemes;
}`}
      />
    </ContentToggle>

    <ContentDivider />

    {/* Block quote */}
    <ContentQuote attribution="Design Philosophy">
      Speech is more than just words — it's the subtle dance of lips, tongue,
      and breath that gives a character presence. Every viseme frame is crafted
      to feel alive, not mechanical.
    </ContentQuote>

    {/* Image placeholder */}
    <ContentImage
      src={icon}
      alt="Speech viseme demonstration"
      caption="CHLEO's mouth sprite — each frame corresponds to a different viseme position."
      variant="framed"
    />

    {/* Final note */}
    <ContentCallout variant="tip">
      You can test the speech system live in the <strong>Playground</strong> tab!
      Type any text, hit Speak, and watch the visemes animate in real-time.
    </ContentCallout>
  </div>
);

/* =========================================================================
   Coming Soon Placeholder
   ========================================================================= */

const ComingSoonContent: React.FC<{ title: string; icon: string }> = ({
  title,
  icon,
}) => (
  <div className="feature-detail-blocks">
    <ContentHeader
      title={title}
      subtitle="This feature documentation is currently being written."
      icon={<img src={icon} alt={title} className="cb-header__icon-img" />}
      level={1}
      badge="Coming Soon"
    />

    <ContentDivider />

    <ContentCallout variant="note">
      The detailed breakdown for <strong>{title}</strong> is coming soon.
      Check back later for a full explanation of how this module works!
    </ContentCallout>
  </div>
);
