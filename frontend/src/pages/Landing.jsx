import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, BarChart3, Brain, Zap, Shield, FileBarChart2, MessageCircle, UploadCloud, UserCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const features = [
    {
      icon: UploadCloud,
      title: "Easy Uploads",
      description: "Drag & drop your CSV/Excel files for instant analysis",
      action: () => navigate('/dashboard'),
      actionLabel: "Try Upload"
    },
    {
      icon: FileBarChart2,
      title: "Visual Insights",
      description: "Auto-generated charts and stats for your data",
      action: () => navigate('/dashboard'),
      actionLabel: "See Demo"
    },
    {
      icon: MessageCircle,
      title: "Ask the AI",
      description: "Get answers about your dataset with natural language",
      action: () => navigate('/dashboard'),
      actionLabel: "Ask Now"
    },
    {
      icon: UserCheck,
      title: "Secure & Private",
      description: "Your data is encrypted and user-scoped",
      action: () => navigate('/register'),
      actionLabel: "Sign Up"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-100 to-pink-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 transition-colors duration-500 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-gray-950/70 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400 drop-shadow-lg" />
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              ADAA
            </span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 shadow-md transition-all duration-300 hover:scale-110 border border-gray-200 dark:border-gray-700"
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-blue-600" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-300" />
            )}
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 pt-36 pb-20 flex-1 w-full"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent drop-shadow-lg"
          >
            Advanced Data Analysis Assistant
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-12 leading-relaxed font-medium"
          >
            Transform your data into <span className="font-bold text-blue-600 dark:text-blue-400">actionable insights</span> with AI-powered analytics.<br className="hidden md:inline" /> Upload, analyze, and visualize your data in seconds.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.07, boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/register')}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 min-w-[200px] focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900"
            >
              Get Started
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/login')}
              className="px-10 py-4 bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-2xl font-semibold text-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 min-w-[200px] focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              Sign In
            </motion.button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-24 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(59,130,246,0.12)" }}
              className="bg-white/90 dark:bg-gray-900/90 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 transition-all duration-300 backdrop-blur-md hover:shadow-2xl flex flex-col items-center"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
              >
                <feature.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                {feature.description}
              </p>
              {feature.action && (
                <button
                  onClick={feature.action}
                  className="mt-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm shadow hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-900"
                >
                  {feature.actionLabel}
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          variants={itemVariants}
          className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          {[
            { value: "10K+", label: "Analyses" },
            { value: "99.9%", label: "Uptime" },
            { value: "<1s", label: "Response Time" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.08 }}
              className="text-center bg-white/70 dark:bg-gray-900/70 rounded-2xl py-8 shadow border border-gray-100 dark:border-gray-800 backdrop-blur-md"
            >
              <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent drop-shadow">
                {stat.value}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl transition-colors duration-300 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            © 2026 ADAA. Advanced Data Analysis Assistant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
