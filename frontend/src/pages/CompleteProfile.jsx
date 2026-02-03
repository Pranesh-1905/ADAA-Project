import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Get OAuth data from URL params
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    
    if (!emailParam) {
      navigate('/login');
      return;
    }
    
    setEmail(emailParam);
    setName(nameParam || '');
    
    // Pre-fill username from name or email (clean it)
    if (nameParam) {
      const cleanName = nameParam.toLowerCase().replace(/\s+/g, '');
      setFormData({ username: cleanName });
    } else {
      setFormData({ username: emailParam.split('@')[0] });
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Send complete profile request to backend
      const response = await fetch('http://127.0.0.1:8000/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: formData.username
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete profile');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      toast.success('Profile completed successfully! Welcome aboard!');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.message || 'Profile completion failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--bg-pattern)' }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          whileHover={{ boxShadow: 'var(--shadow-xl)', y: -2 }}
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
          
          <div className="text-center mb-8">
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-extrabold gradient-text"
            >
              Complete Your Profile
            </motion.h2>
            <p className="mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Choose a username to finish setup
            </p>
          </div>

          {/* Display OAuth info */}
          <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text)' }}>Email:</strong> {email}
            </p>
            {name && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text)' }}>Name:</strong> {name}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  Username
                </label>
              </div>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => {
                  // Remove spaces and convert to lowercase
                  const cleanUsername = e.target.value.replace(/\s+/g, '').toLowerCase();
                  setFormData({ ...formData, username: cleanUsername });
                }}
                className="input"
                placeholder="Choose a unique username"
                aria-label="Username"
                autoComplete="username"
                minLength={3}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Must be at least 3 characters, no spaces or special characters
              </p>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl text-sm flex items-start gap-3"
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)'
                }}
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
