import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '../api';
import { useToast } from '../context/ToastContext';
const handleGoogleLogin = () => {
  window.location.href = 'http://localhost:8000/auth/google/login';
};
export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      toast.success('Welcome back! Login successful');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
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
              Welcome Back
            </motion.h2>
            <p className="mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Sign in to continue your analysis
            </p>
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
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input"
                placeholder="Enter your username"
                aria-label="Username"
                autoComplete="username"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-12"
                  placeholder="Enter your password"
                  aria-label="Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm select-none" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="accent-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-medium hover:underline focus:outline-none"
                style={{ color: 'var(--primary)' }}
                onClick={() => alert('Password reset coming soon!')}
              >
                Forgot password?
              </button>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl text-sm mt-2 flex items-start gap-3"
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
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg mt-6"
              aria-label="Sign in to your account"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--border)' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="px-2"
                  style={{ background: 'var(--surface)', color: 'var(--text-tertiary)' }}
                >
                  Or continue with
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-secondary w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Sign up
            </Link>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <Link
            to="/"
            className="transition-colors text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ← Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
