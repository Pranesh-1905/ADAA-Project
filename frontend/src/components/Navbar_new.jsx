import { motion } from 'framer-motion';
import { Sun, Moon, User, LogOut, BarChart3, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../api';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData.user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  return (
    <nav 
      className="border-b relative z-20" 
      style={{
        background: 'var(--surface-glass)', 
        backdropFilter: 'blur(var(--blur-lg))',
        WebkitBackdropFilter: 'blur(var(--blur-lg))',
        borderColor: 'var(--border)', 
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              style={{color: 'var(--primary)'}}
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <BarChart3 className="w-6 h-6" />
            </motion.div>
            <h1 className="text-lg font-bold gradient-text">
              ADAA Analytics
            </h1>
          </motion.div>

          <motion.div 
            className="flex items-center gap-3 sm:gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all"
              style={{
                background: 'var(--surface-secondary)', 
                color: 'var(--primary)',
                boxShadow: 'var(--shadow-xs)'
              }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </motion.button>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Profile Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/profile')}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-all" 
                  style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border)'
                  }}
                  aria-label="Go to profile"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      color: 'var(--text-inverse)'
                    }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {user.username}
                  </span>
                </motion.button>

                {/* Mobile profile icon with dropdown indicator */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/profile')}
                  className="sm:hidden w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border)'
                  }}
                  aria-label="Go to profile"
                >
                  <Settings className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                </motion.button>

                {/* Logout Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-white font-medium transition-all btn-sm sm:btn"
                  style={{background: 'var(--danger)', boxShadow: 'var(--shadow-sm)'}}
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </nav>
  );
}
