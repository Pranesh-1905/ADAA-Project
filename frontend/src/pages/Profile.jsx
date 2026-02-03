import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Mail, Save, Eye, EyeOff, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar_new';
import api, { getCurrentUser } from '../api';
import { Spinner } from '../components/LoadingStates';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // Profile form
  const [profileData, setProfileData] = useState({
    username: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  
  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.user);
      setProfileData({
        username: response.user.username || '',
        email: response.user.email || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
      }

      const data = await response.json();
      setUser(data.user);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      toast.success('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      const errorMsg = error.message;
      setProfileMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      const errorMsg = 'New passwords do not match';
      setPasswordMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      const errorMsg = 'Password must be at least 6 characters';
      setPasswordMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      setPasswordLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(0);
    } catch (error) {
      const errorMsg = error.message;
      setPasswordMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: 'var(--bg-pattern)' }}
      />
      
      <Navbar />

      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
              Profile Settings
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Manage your account settings and preferences
            </p>
          </motion.div>

          <div className="grid gap-6">
            {/* Profile Information Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card card-lg relative overflow-hidden"
              style={{
                background: 'var(--surface-glass)',
                backdropFilter: 'blur(var(--blur-lg))',
                WebkitBackdropFilter: 'blur(var(--blur-lg))',
                border: '1px solid var(--surface-glass-border)'
              }}
            >
              {/* Top gradient border */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
              />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    <User className="w-6 h-6" style={{ color: 'var(--text-inverse)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                      Profile Information
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Update your account details
                    </p>
                  </div>
                </div>

                {!editMode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditMode(true)}
                    className="btn btn-secondary btn-sm"
                    aria-label="Edit profile"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                )}
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Username */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    <User className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    disabled={!editMode}
                    className={`input ${!editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Enter your username"
                    aria-label="Username"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    <Mail className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!editMode}
                    className={`input ${!editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Enter your email"
                    aria-label="Email"
                  />
                </div>

                {/* Messages */}
                <AnimatePresence>
                  {profileMessage.text && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-xl text-sm flex items-start gap-3"
                      style={{
                        background: profileMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                        border: `1px solid ${profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                        color: profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}
                      role="alert"
                    >
                      {profileMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{profileMessage.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                {editMode && (
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={profileLoading}
                      className="btn btn-primary flex-1"
                    >
                      {profileLoading ? (
                        <>
                          <Spinner size="sm" color="white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        setProfileData({
                          username: user.username || '',
                          email: user.email || ''
                        });
                        setProfileMessage({ type: '', text: '' });
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </motion.button>
                  </div>
                )}
              </form>
            </motion.div>

            {/* Change Password Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card card-lg relative overflow-hidden"
              style={{
                background: 'var(--surface-glass)',
                backdropFilter: 'blur(var(--blur-lg))',
                WebkitBackdropFilter: 'blur(var(--blur-lg))',
                border: '1px solid var(--surface-glass-border)'
              }}
            >
              {/* Top gradient border */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, var(--accent-pink), var(--accent-orange))' }}
              />

              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  <Lock className="w-6 h-6" style={{ color: 'var(--text-inverse)' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                    Change Password
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    <Lock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input pr-12"
                      placeholder="Enter current password"
                      required
                      aria-label="Current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    <Lock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        setPasswordStrength(calculatePasswordStrength(e.target.value));
                      }}
                      className="input pr-12"
                      placeholder="Enter new password"
                      required
                      aria-label="New password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className="h-1 flex-1 rounded-full transition-all"
                            style={{
                              background: passwordStrength >= level
                                ? passwordStrength <= 1 ? 'var(--danger)'
                                : passwordStrength <= 2 ? 'var(--warning)'
                                : passwordStrength <= 3 ? 'var(--accent-cyan)'
                                : 'var(--success)'
                                : 'var(--border)'
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Password strength: {
                          passwordStrength <= 1 ? 'Weak' :
                          passwordStrength <= 2 ? 'Fair' :
                          passwordStrength <= 3 ? 'Good' : 'Strong'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    <Lock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="input pr-12"
                      placeholder="Confirm new password"
                      required
                      aria-label="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <AnimatePresence>
                  {passwordMessage.text && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-xl text-sm flex items-start gap-3"
                      style={{
                        background: passwordMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                        border: `1px solid ${passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                        color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}
                      role="alert"
                    >
                      {passwordMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{passwordMessage.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-primary w-full"
                >
                  {passwordLoading ? (
                    <>
                      <Spinner size="sm" color="white" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Change Password
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
