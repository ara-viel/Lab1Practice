import React, { useState } from 'react';
import Navbar from './Navbar';
import '../assets/LoginPage.css';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

function LoginPage({ onAuthenticated }) {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (isSignup) {
      if (!formData.fullName) newErrors.fullName = 'Full name is required';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const userData = {
      email: formData.email,
      fullName: isSignup ? formData.fullName : formData.email.split('@')[0],
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('user', JSON.stringify(userData));
    if (onAuthenticated) onAuthenticated();
  };

  return (
    <div className="login-page">
      <Navbar isLandingPage={true} />

      <main className="auth-section">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{isSignup ? 'Create Account' : 'Login'}</h2>
              <p>{isSignup ? 'Sign up to start monitoring' : 'Access your account'}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {isSignup && (
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={errors.fullName ? 'error' : ''}
                    />
                  </div>
                  {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                  />
                </div>
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                  />
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              {isSignup && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} />
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={errors.confirmPassword ? 'error' : ''}
                    />
                  </div>
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>
              )}

              <button type="submit" className="submit-btn">
                {isSignup ? 'Create Account' : 'Login'}
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="auth-toggle">
              <p>
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="toggle-btn"
                >
                  {isSignup ? 'Login' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
