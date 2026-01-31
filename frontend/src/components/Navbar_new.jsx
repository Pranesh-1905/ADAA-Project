import { motion } from 'framer-motion';
import { Sun, Moon, User, LogOut, BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../api';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../api';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);

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
    <nav className="border-b" style={{background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div style={{color: 'var(--primary)'}}>
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold gradient-text">
              ADAA Analytics
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{background: 'var(--surface-secondary)', color: 'var(--primary)'}}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </motion.button>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background: 'var(--surface-secondary)'}}>
                  <User className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
                  <span className="text-sm font-medium">
                    {user.username}
                  </span>
                </div>

                {/* Logout Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all"
                  style={{background: 'var(--danger)'}}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
