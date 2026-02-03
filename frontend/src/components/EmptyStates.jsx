import { motion } from 'framer-motion';
import { 
  FileQuestion, 
  Search, 
  Inbox, 
  AlertCircle, 
  CheckCircle,
  BarChart3,
  MessageSquare,
  Upload,
  Folder,
  Database
} from 'lucide-react';

const EmptyStateContainer = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
  >
    {children}
  </motion.div>
);

// Generic Empty State
export const EmptyState = ({ 
  icon: Icon = Inbox, 
  title = 'No data found', 
  description = 'There is nothing to display here yet.',
  action,
  actionLabel = 'Get started',
  iconColor = 'var(--text-tertiary)'
}) => {
  return (
    <EmptyStateContainer>
      <motion.div
        className="mb-6 p-6 rounded-full"
        style={{ background: 'var(--surface-secondary)' }}
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Icon className="w-16 h-16" style={{ color: iconColor, opacity: 0.5 }} />
      </motion.div>
      <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="text-base mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action}
          className="btn btn-primary"
        >
          {actionLabel}
        </motion.button>
      )}
    </EmptyStateContainer>
  );
};

// No Files Empty State
export const NoFilesState = ({ onUpload }) => (
  <EmptyState
    icon={Upload}
    title="No files uploaded yet"
    description="Upload your first CSV or Excel file to start analyzing your data with AI-powered insights."
    action={onUpload}
    actionLabel="Upload File"
    iconColor="var(--primary)"
  />
);

// No Search Results
export const NoSearchResults = ({ searchTerm, onClear }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description={searchTerm ? `We couldn't find anything matching "${searchTerm}". Try adjusting your search.` : 'Try searching for something else.'}
    action={onClear}
    actionLabel="Clear Search"
    iconColor="var(--accent-cyan)"
  />
);

// No Charts Available
export const NoChartsState = ({ onCreate }) => (
  <EmptyState
    icon={BarChart3}
    title="No charts available"
    description="Create your first chart to visualize your data and discover insights."
    action={onCreate}
    actionLabel="Create Chart"
    iconColor="var(--secondary)"
  />
);

// No Messages
export const NoMessagesState = () => (
  <EmptyState
    icon={MessageSquare}
    title="No messages yet"
    description="Start a conversation to get AI-powered insights about your data."
    iconColor="var(--accent-teal)"
  />
);

// Empty Folder
export const EmptyFolderState = () => (
  <EmptyState
    icon={Folder}
    title="This folder is empty"
    description="Add files or create new items to get started."
    iconColor="var(--accent-orange)"
  />
);

// No Data
export const NoDataState = ({ message }) => (
  <EmptyState
    icon={Database}
    title="No data available"
    description={message || "There's no data to display at the moment."}
    iconColor="var(--text-tertiary)"
  />
);

// Error State
export const ErrorState = ({ 
  title = 'Something went wrong', 
  description = 'An error occurred while loading the data.',
  onRetry 
}) => (
  <EmptyStateContainer>
    <motion.div
      className="mb-6 p-6 rounded-full"
      style={{ background: 'var(--danger-bg)' }}
      animate={{ rotate: [0, 10, -10, 0] }}
      transition={{ duration: 0.5 }}
    >
      <AlertCircle className="w-16 h-16" style={{ color: 'var(--danger)' }} />
    </motion.div>
    <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
      {title}
    </h3>
    <p className="text-base mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
      {description}
    </p>
    {onRetry && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRetry}
        className="btn btn-primary"
      >
        Try Again
      </motion.button>
    )}
  </EmptyStateContainer>
);

// Success State
export const SuccessState = ({ 
  title = 'Success!', 
  description = 'Your action was completed successfully.',
  onContinue,
  continueLabel = 'Continue'
}) => (
  <EmptyStateContainer>
    <motion.div
      className="mb-6 p-6 rounded-full"
      style={{ background: 'var(--success-bg)' }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
    >
      <CheckCircle className="w-16 h-16" style={{ color: 'var(--success)' }} />
    </motion.div>
    <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
      {title}
    </h3>
    <p className="text-base mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
      {description}
    </p>
    {onContinue && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onContinue}
        className="btn btn-primary"
      >
        {continueLabel}
      </motion.button>
    )}
  </EmptyStateContainer>
);

export default {
  EmptyState,
  NoFilesState,
  NoSearchResults,
  NoChartsState,
  NoMessagesState,
  EmptyFolderState,
  NoDataState,
  ErrorState,
  SuccessState
};
