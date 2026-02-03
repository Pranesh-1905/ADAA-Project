import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileBarChart2, MessageCircle, UploadCloud, UserCheck, Moon, Sun, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{background: 'var(--bg)', color: 'var(--text)'}}>
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--bg-pattern)' }}
      />
      
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(var(--blur-lg))',
          WebkitBackdropFilter: 'blur(var(--blur-lg))',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="container mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <motion.div 
              style={{color: 'var(--primary)'}}
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <BarChart3 className="w-8 h-8" />
            </motion.div>
            <span className="text-2xl font-extrabold tracking-tight gradient-text">
              ADAA
            </span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg border"
            style={{
              background: 'var(--surface-secondary)', 
              borderColor: 'var(--border)'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle theme"
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
        className="container mx-auto px-4 pt-32 pb-20 flex-1 w-full relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'var(--primary-bg)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)'
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
            </span>
            <span className="text-sm font-semibold">AI-Powered Analytics Platform</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight"
          >
            <span className="gradient-text">Advanced Data</span>
            <br />
            <span className="gradient-text">Analysis Assistant</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl md:text-2xl mb-12 leading-relaxed font-medium max-w-3xl mx-auto"
            style={{color: 'var(--text-secondary)'}}
          >
            Transform your data into actionable insights with AI-powered analytics.
            <br className="hidden sm:inline" /> 
            Upload, analyze, and visualize your data in seconds.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/register')}
              className="btn btn-primary btn-lg min-w-[200px] shadow-xl"
              aria-label="Get started with ADAA"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="btn btn-outline min-w-[200px]"
              aria-label="Sign in to your account"
            >
              Sign In
            </motion.button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-6 text-sm"
            style={{color: 'var(--text-tertiary)'}}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" style={{color: 'var(--success)'}} />
              <span>10K+ Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4" style={{color: 'var(--success)'}} />
              <span>50K+ Analyses</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{color: 'var(--success)'}} />
              <span>99.9% Uptime</span>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-28 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className="card card-lg flex flex-col items-center text-center group relative overflow-hidden"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)'
              }}
            >
              {/* Gradient overlay on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))'
                }}
              />
              
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-md group-hover:shadow-xl transition-all relative z-10"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))'
                }}
              >
                <feature.icon className="w-8 h-8" style={{color: 'var(--text-inverse)'}} />
              </motion.div>
              <h3 className="text-lg font-bold mb-3 relative z-10" style={{color: 'var(--text)'}}>
                {feature.title}
              </h3>
              <p className="relative z-10" style={{color: 'var(--text-secondary)'}}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          variants={itemVariants}
          className="mt-28 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {[
            { value: "10K+", label: "Analyses Completed", color: 'var(--primary)' },
            { value: "99.9%", label: "Uptime Guarantee", color: 'var(--success)' },
            { value: "<1s", label: "Response Time", color: 'var(--accent-cyan)' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05, y: -5 }}
              className="card card-lg text-center relative overflow-hidden group"
              style={{
                background: 'var(--surface)',
                borderColor: stat.color
              }}
            >
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{ background: stat.color }}
              />
              <div className="text-5xl font-extrabold gradient-text mb-2 relative z-10">
                {stat.value}
              </div>
              <div className="font-semibold relative z-10" style={{color: 'var(--text-secondary)'}}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          variants={itemVariants}
          className="mt-28 max-w-3xl mx-auto relative overflow-hidden"
        >
          <div 
            className="card card-lg text-center relative z-10"
            style={{
              background: 'var(--surface-glass)',
              backdropFilter: 'blur(var(--blur-lg))',
              WebkitBackdropFilter: 'blur(var(--blur-lg))',
              borderColor: 'var(--primary)',
              borderWidth: '2px'
            }}
          >
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))'
              }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: 'var(--text)'}}>
                Ready to get started?
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto" style={{color: 'var(--text-secondary)'}}>
                Join thousands of data analysts using ADAA to unlock insights from their data.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="btn btn-primary btn-lg shadow-xl"
              >
                Sign Up Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer 
        className="border-t py-8 relative z-10" 
        style={{
          borderTopColor: 'var(--border)', 
          background: 'var(--surface)',
          backdropFilter: 'blur(var(--blur-md))',
          WebkitBackdropFilter: 'blur(var(--blur-md))'
        }}
      >
        <div className="container mx-auto px-4 text-center" style={{color: 'var(--text-secondary)'}}>
          <p className="text-sm sm:text-base">
            © 2026 ADAA Analytics. Built with ❤️ for data enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
}
