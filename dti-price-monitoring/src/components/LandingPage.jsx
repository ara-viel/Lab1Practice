import React from 'react';
import Navbar from './Navbar';
import '../assets/LandingPage.css';
import { CheckCircle, TrendingUp, BarChart3, FileText } from 'lucide-react';

function LandingPage({ onLoginClick }) {

  // Landing page has only hero + features and Login button in Navbar

  return (
    <div className="landing-page">
      <Navbar isLandingPage={true} onLoginClick={onLoginClick} />
      
      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Real-Time Price <span className="highlight">Monitoring</span>
            </h1>
            <p className="hero-subtitle">
              Track commodity prices across multiple stores with comprehensive analysis and insights.
              Make informed decisions with DTI Price Monitor.
            </p>
            
            <div className="features-preview">
              <div className="feature-item">
                <TrendingUp size={24} />
                <span>Live Price Tracking</span>
              </div>
              <div className="feature-item">
                <BarChart3 size={24} />
                <span>Price Analysis</span>
              </div>
              <div className="feature-item">
                <FileText size={24} />
                <span>Detailed Reports</span>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="auth-section">
          <div className="auth-container">
            <div className="benefits-container">
              <h3>Why Choose DTI Price Monitor?</h3>
              <div className="benefits-list">
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <div>
                    <h4>Real-Time Updates</h4>
                    <p>Get instant price updates from multiple sources</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <div>
                    <h4>Comprehensive Analysis</h4>
                    <p>Detailed analytics and trend reports</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <div>
                    <h4>Easy Data Management</h4>
                    <p>Import, edit, and manage your price data effortlessly</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <div>
                    <h4>Export Reports</h4>
                    <p>Generate and download comprehensive reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
