import React, { useState } from 'react';
import { Menu as MenuIcon, X, LogOut } from 'lucide-react';
import '../assets/Navbar.css';

function Navbar({ isLandingPage = false, user = null, onLogout = null, onLoginClick = null, onHomeClick = null }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    if (onLogout) onLogout();
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    if (onHomeClick) {
      onHomeClick();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-brand" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
          <img src="/logo-DTI.png" alt="DTI Logo" className="brand-icon" style={{ height: '32px', width: 'auto' }} />
          <span className="brand-text">DTI Monitor</span>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-menu desktop">
          <>
            <a href="#home" className="nav-link" onClick={handleHomeClick}>Home</a>
            <a href="#services" className="nav-link">Services</a>
          </>
        </div>

        {/* User Section / Auth Buttons */}
        <div className="navbar-auth">
          {user ? (
            <div className="user-section">
              <span className="user-name">{user.fullName || user.email}</span>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              {isLandingPage && (
                <button className="login-btn" onClick={onLoginClick}>Login</button>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="navbar-menu-mobile">
          <>
            <a href="#home" className="mobile-nav-link" onClick={handleHomeClick}>Home</a>
            <a href="#services" className="mobile-nav-link">Services</a>
          </>
          
          
          {user ? (
            <>
              <span className="mobile-user-name">{user.fullName || user.email}</span>
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              {isLandingPage && (
                <>
                  <button className="mobile-login-btn" onClick={onLoginClick}>Login</button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
