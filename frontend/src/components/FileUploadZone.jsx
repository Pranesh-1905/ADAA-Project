import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FileUploadZone = ({ onFilesSelected, maxSize = 50 * 1024 * 1024 }) => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'ready', // ready, uploading, success, error
      progress: 0,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectedFileData = rejectedFiles.map(({ file, errors }) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'error',
        progress: 0,
        error: errors[0]?.message || 'File rejected'
      }));
      setFiles(prev => [...prev, ...rejectedFileData]);
    }

    // Notify parent component
    if (onFilesSelected && acceptedFiles.length > 0) {
      onFilesSelected(newFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize,
    multiple: true
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const updateFileStatus = (id, status, progress = 0, error = null) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status, progress, error } : f
    ));
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <motion.div
        {...getRootProps()}
        className="border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all relative overflow-hidden"
        style={{
          borderColor: isDragActive ? 'var(--primary)' : 'var(--border)',
          background: isDragActive ? 'var(--primary-bg)' : 'var(--surface-secondary)',
        }}
        whileHover={{ scale: 1.01, borderColor: 'var(--primary)' }}
        animate={{
          borderColor: isDragActive ? 'var(--primary)' : 'var(--border)',
        }}
      >
        {/* Animated background on drag */}
        {isDragActive && (
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
          />
        )}
        
        <input {...getInputProps()} aria-label="File upload input" />
        <motion.div
          animate={isDragActive ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative z-10"
        >
          <Upload className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4" style={{ color: isDragActive ? 'var(--primary)' : 'var(--text-tertiary)' }} />
        </motion.div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2 relative z-10" style={{ color: isDragActive ? 'var(--primary)' : 'var(--text)' }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </h3>
        <p className="mb-4 relative z-10 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          or click to browse
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm relative z-10" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
          <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
          <span>CSV, Excel (.xlsx, .xls) • Max {formatFileSize(maxSize)}</span>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 space-y-3"
          >
            <h4 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Selected Files ({files.length})
            </h4>
            {files.map((fileData) => (
              <motion.div
                key={fileData.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-4 rounded-lg card-sm"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`
                    p-2 rounded-lg
                    ${fileData.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' : ''}
                    ${fileData.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : ''}
                    ${fileData.status === 'ready' || fileData.status === 'uploading' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                  `}>
                    {fileData.status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                    {fileData.status === 'error' && <AlertCircle className="h-6 w-6 text-red-600" />}
                    {(fileData.status === 'ready' || fileData.status === 'uploading') && <File className="h-6 w-6 text-blue-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {fileData.file.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {formatFileSize(fileData.file.size)}
                      {fileData.error && (
                        <span className="ml-2" style={{ color: 'var(--danger)' }}>• {fileData.error}</span>
                      )}
                    </p>

                    {/* Progress Bar */}
                    {fileData.status === 'uploading' && (
                      <div className="mt-2 w-full rounded-full h-1.5" style={{ background: 'var(--surface-tertiary)' }}>
                        <motion.div
                          className="h-1.5 rounded-full"
                          style={{ background: 'var(--primary)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${fileData.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeFile(fileData.id)}
                  className="ml-4 p-2 rounded-lg transition-colors btn-ghost"
                  aria-label="Remove file"
                >
                  <X className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;
