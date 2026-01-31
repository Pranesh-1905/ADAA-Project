import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileBarChart2, MessageCircle, UploadCloud, UserCheck, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
      description: "Drag & drop your CSV/Excel files for instant analysis"
    },
    {
      icon: FileBarChart2,
      title: "Visual Insights",
      description: "Auto-generated charts and stats for your data"
    },
    {
      icon: MessageCircle,
      title: "Ask the AI",
      description: "Get answers about your dataset with natural language"
    },
    {
      icon: UserCheck,
      title: "Secure & Private",
      description: "Your data is encrypted and user-scoped"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'var(--bg)', color: 'var(--text)'}}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
        style={{
          background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="container mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div style={{color: 'var(--primary)'}}>
              <BarChart3 className="w-8 h-8" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight gradient-text">
              ADAA
            </span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={toggleTheme}
            className="p-2 rounded-full shadow-md transition-all duration-300 hover:scale-110 border"
            style={{background: 'var(--surface-secondary)', borderColor: 'var(--border)'}}
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" style={{color: 'var(--primary)'}} />
            ) : (
              <Sun className="w-5 h-5" style={{color: 'var(--accent-orange)'}} />
            )}
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 pt-28 pb-20 flex-1 w-full"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-extrabold mb-6 gradient-text"
          >
            Advanced Data Analysis Assistant
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl mb-12 leading-relaxed font-medium"
            style={{color: 'var(--text-secondary)'}}
          >
            Transform your data into actionable insights with AI-powered analytics.<br className="hidden md:inline" /> Upload, analyze, and visualize your data in seconds.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.07, boxShadow: 'var(--shadow-lg)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/register')}
              className="btn btn-primary min-w-[200px]"
            >
              Get Started
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/login')}
              className="btn btn-secondary min-w-[200px]"
            >
              Sign In
            </motion.button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="card card-lg flex flex-col items-center text-center group"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-md group-hover:shadow-lg transition-all"
                style={{background: 'linear-gradient(135deg, var(--primary), var(--secondary))'}}
              >
                <feature.icon className="w-8 h-8" style={{color: 'var(--text-inverse)'}} />
              </motion.div>
              <h3 className="text-lg font-bold mb-2">
                {feature.title}
              </h3>
              <p style={{color: 'var(--text-secondary)'}}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          variants={itemVariants}
          className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: "10K+", label: "Analyses" },
            { value: "99.9%", label: "Uptime" },
            { value: "<1s", label: "Response Time" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.08 }}
              className="card text-center"
            >
              <div className="text-4xl font-extrabold gradient-text drop-shadow">
                {stat.value}
              </div>
              <div className="mt-2 font-medium" style={{color: 'var(--text-secondary)'}}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          variants={itemVariants}
          className="card card-lg text-center mt-20 max-w-2xl mx-auto"
          style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', borderColor: 'var(--primary)'}}
        >
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
            Join thousands of data analysts using ADAA to unlock insights from their data.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="btn btn-primary"
          >
            Sign Up Now →
          </motion.button>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t py-8" style={{borderTopColor: 'var(--border)', background: 'var(--surface)'}}>
        <div className="container mx-auto px-4 text-center" style={{color: 'var(--text-secondary)'}}>
          <p>© 2026 ADAA Analytics. Built with ❤️ for data enthusiasts.</p>
        </div>
      </footer>
    </div>
  );
}
