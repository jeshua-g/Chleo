import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

// Icons from root assets folder
import ICON_BRAIN from '../../assets/brain.png';
import ICON_EYES from '../../assets/eyes.png';
import ICON_MOUTH from '../../assets/mouth.png';
import ICON_HEART from '../../assets/heart.png';

interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const FEATURE_PANELS: FeatureCardData[] = [
  {
    id: 'intelligence',
    title: 'Intelligence',
    description: 'Various behaviors and customizable rules powered by LLMs for realism.',
    icon: ICON_BRAIN,
  },
  {
    id: 'monitoring',
    title: 'Monitoring',
    description: 'Monitors your activity and guides you to be productive.',
    icon: ICON_EYES,
  },
  {
    id: 'speech',
    title: 'Speech',
    description: 'Nuanced and realistic speech animation by using visemes.',
    icon: ICON_MOUTH,
  },
  {
    id: 'emotions',
    title: 'Emotions',
    description: "Have various emotions using Plutchik's wheel.",
    icon: ICON_HEART,
  },
];

export const BlogPage: React.FC = () => {
  return (
    <div className="app-layout">
      <Header activeTab="blog" />

      <main className="page-container">
        {/* Page Banner */}
        <section className="features-banner-section panel-section panel-bg-discussions">
          <div className="features-banner-content">
            <h2 className="banner-title">CHLEO Features</h2>
            <p className="banner-subtitle">
              Here are chleo's capabilities. Here's a complete breakdown and discussion on how each feature works!
              Enjoy creating and I hope you'll add more features to her to make her more realistic!
              Feel free to contact me for clarifications, additions or changes you want to incorporate.
            </p>
          </div>
        </section>

        {/* 4 Feature Panels (Cards Grid) */}
        <section className="features-grid-section">
          <h3 className="section-subtitle">Companion Modules</h3>

          <div className="features-cards-grid">
            {FEATURE_PANELS.map(panel => (
              <div key={panel.id} id={panel.id} className="feature-module-card disabled-card">
                <div className="feature-card-header">
                  <div className="feature-card-icon-wrap">
                    <img src={panel.icon} alt={panel.title} className="feature-card-icon-img" />
                  </div>
                  <span className="badge-coming-soon">[Coming Soon]</span>
                </div>
                <div className="feature-card-body">
                  <h4 className="feature-card-title">{panel.title}</h4>
                  <p className="feature-card-desc">{panel.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
