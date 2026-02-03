import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Spinner Loading
export const Spinner = ({ size = 'md', color = 'primary' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    primary: 'var(--primary)',
    secondary: 'var(--secondary)',
    white: '#ffffff'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizes[size]}`}
      style={{ color: colors[color] }}
    >
      <Loader2 className="w-full h-full" />
    </motion.div>
  );
};

// Skeleton Loading
export const Skeleton = ({ className = '', width, height }) => {
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        background: 'linear-gradient(90deg, var(--surface-secondary) 0%, var(--surface-tertiary) 50%, var(--surface-secondary) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s ease-in-out infinite'
      }}
    />
  );
};

// Card Skeleton
export const CardSkeleton = () => {
  return (
    <div className="card">
      <Skeleton height="2rem" className="mb-4" width="60%" />
      <Skeleton height="1rem" className="mb-2" />
      <Skeleton height="1rem" className="mb-2" width="80%" />
      <Skeleton height="1rem" width="90%" />
      <div className="mt-4 flex gap-2">
        <Skeleton height="2.5rem" width="5rem" />
        <Skeleton height="2.5rem" width="5rem" />
      </div>
    </div>
  );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="2rem" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="1.5rem" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Loading Overlay
export const LoadingOverlay = ({ message = 'Loading...', fullScreen = false }) => {
  return (
    <div
      className={`${fullScreen ? 'fixed inset-0' : 'absolute inset-0'} flex items-center justify-center z-50`}
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(var(--blur-md))',
        WebkitBackdropFilter: 'blur(var(--blur-md))'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-8 rounded-2xl card-glass"
      >
        <Spinner size="lg" />
        <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
          {message}
        </p>
      </motion.div>
    </div>
  );
};

// Pulse Loading
export const PulseLoader = ({ count = 3 }) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-3 h-3 rounded-full"
          style={{ background: 'var(--primary)' }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
};

// Progress Bar
export const ProgressBar = ({ progress = 0, showLabel = true, className = '' }) => {
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Progress
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--surface-tertiary)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// Shimmer Effect
export const ShimmerCard = () => {
  return (
    <div className="card relative overflow-hidden">
      <div className="space-y-4">
        <div className="h-4 rounded" style={{ background: 'var(--surface-tertiary)' }} />
        <div className="h-4 rounded w-4/5" style={{ background: 'var(--surface-tertiary)' }} />
        <div className="h-4 rounded w-3/5" style={{ background: 'var(--surface-tertiary)' }} />
      </div>
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
        }}
      />
    </div>
  );
};

export default {
  Spinner,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  LoadingOverlay,
  PulseLoader,
  ProgressBar,
  ShimmerCard
};
