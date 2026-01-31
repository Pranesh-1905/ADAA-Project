
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import AIMessage from '../components/AIMessage';
import {
  getJobs,
  uploadFile,
  analyzeFile,
  getJobStatus,
  visualizeJob,
  askQuestion,
  previewJob,
  deleteJob,
  renameJob,
  cancelJob
} from '../api';
import {
  BarChart3,
  Upload,
  FileText,
  TrendingUp,
  MessageSquare,
  BarChart2,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Send,
  Download,
  Settings,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Trash2,
  Pencil,
  XCircle
} from 'lucide-react';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'statistics', 'visualizations', 'insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChart, setExpandedChart] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Data Fetching ---
  const fetchJobs = async () => {
    try {
      const data = await getJobs();
      // Sort by recency if possible? DB doesn't have timestamp exposed in result, but let's assume order
      setJobs(data.reverse()); // Show newest first

      // If we have a selected job, update it from the fresh list
      if (selectedJob) {
        const updated = data.find(j => j.task_id === selectedJob.task_id);
        if (updated) setSelectedJob(updated);
      }
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll every 5s for updates
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedJob || selectedJob.status !== 'completed') {
        setPreviewData(null);
        setPreviewError('');
        return;
      }

      setPreviewLoading(true);
      setPreviewError('');
      try {
        const preview = await previewJob(selectedJob.task_id);
        setPreviewData(preview);
      } catch (error) {
        console.error('Preview load error:', error);
        setPreviewError(error.message || 'Failed to load preview');
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [selectedJob]);

  // --- Handlers ---

  const handleFiles = async (files) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    setUploading(true);
    for (const file of fileList) {
      try {
        await uploadFile(file);
        const { task_id } = await analyzeFile(file.name);
        setAnalyzingIds(prev => new Set(prev).add(task_id));
        checkStatusLoop(task_id);
      } catch (error) {
        alert(`Upload/Analysis failed for ${file.name}: ${error.message}`);
      }
    }
    setUploading(false);
  };

  const handleFileUpload = async (e) => {
    await handleFiles(e.target.files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    await handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  // Poll status for a specific new task until it's done or appears in jobs
  const checkStatusLoop = async (taskId) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 1s = 20s (analysis is fast usually)

    const check = async () => {
      if (attempts >= maxAttempts) {
        setAnalyzingIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        return;
      }

      try {
        const statusData = await getJobStatus(taskId);
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setAnalyzingIds(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          fetchJobs();
          return;
        }
      } catch (e) {
        // ignore errors during poll
      }

      attempts++;
      setTimeout(check, 1000);
    };

    check();
  };

  const handleGenerateVisuals = async (job) => {
    try {
      setAnalyzingIds(prev => new Set(prev).add(job.task_id));
      setSelectedJob(job); // Ensure we're viewing the right job
      await visualizeJob(job.task_id);
      
      // Poll for charts
      let attempts = 0;
      const maxAttempts = 30; // Up to 30 attempts (60 seconds)
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const updated = await getJobs();
          const job_with_charts = updated.find(j => j.task_id === job.task_id);
          
          if (job_with_charts?.charts && job_with_charts.charts.length > 0) {
            // Charts are ready! Update UI immediately
            setSelectedJob(job_with_charts);
            setJobs(updated.reverse());
            setActiveTab('visualizations'); // Auto-switch to visualizations tab
            clearInterval(pollInterval);
            setAnalyzingIds(prev => {
              const next = new Set(prev);
              next.delete(job.task_id);
              return next;
            });
          } else if (attempts >= maxAttempts) {
            // Stop polling after max attempts
            clearInterval(pollInterval);
            setAnalyzingIds(prev => {
              const next = new Set(prev);
              next.delete(job.task_id);
              return next;
            });
            fetchJobs(); // Final fetch to update UI
          }
        } catch (error) {
          console.error("Error polling for charts", error);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error("Visuals generation failed", error);
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(job.task_id);
        return next;
      });
    }
  };

  const handleDeleteJob = async (job) => {
    const confirmDelete = window.confirm(`Delete ${job.filename}? This will remove the file and its analysis.`);
    if (!confirmDelete) return;
    try {
      await deleteJob(job.task_id);
      if (selectedJob?.task_id === job.task_id) {
        setSelectedJob(null);
        setActiveTab('overview');
      }
      fetchJobs();
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const handleRenameJob = async (job) => {
    const newName = window.prompt('Enter a new filename:', job.filename);
    if (!newName || newName.trim() === job.filename) return;
    try {
      const res = await renameJob(job.task_id, newName.trim());
      if (selectedJob?.task_id === job.task_id) {
        setSelectedJob({ ...selectedJob, filename: res.filename });
      }
      fetchJobs();
    } catch (error) {
      alert(`Rename failed: ${error.message}`);
    }
  };

  const handleCancelJob = async (job) => {
    const confirmCancel = window.confirm(`Cancel processing for ${job.filename}?`);
    if (!confirmCancel) return;
    try {
      await cancelJob(job.task_id);
      fetchJobs();
    } catch (error) {
      alert(`Cancel failed: ${error.message}`);
    }
  };

  const handleDownloadChart = (chart) => {
    const link = document.createElement('a');
    link.href = chart.data;
    const safeName = (selectedJob?.filename || 'chart').replace(/[^a-z0-9-_]+/gi, '_');
    link.download = `${safeName}-${chart.name}.png`;
    link.click();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedJob) return;

    // Check if analysis is completed
    if (selectedJob.status !== 'completed') {
      setChatHistory(prev => [...prev, { 
        role: 'error', 
        content: "Analysis is still processing. Please wait for it to complete before asking questions." 
      }]);
      return;
    }

    const userMsg = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, userMsg]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await askQuestion(userMsg.content, selectedJob.task_id);
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (error) {
      let errorMessage = "Failed to get answer. ";
      if (error.message.includes('202')) {
        errorMessage += "Analysis is still processing.";
      } else if (error.message.includes('404')) {
        errorMessage += "Analysis not found.";
      } else if (error.message.includes('400')) {
        errorMessage += "No analysis results available.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      setChatHistory(prev => [...prev, { role: 'error', content: errorMessage }]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectJob = (job) => {
    setSelectedJob(job);
    setChatHistory([]);
    setActiveTab('overview');
  };

  const filteredJobs = jobs.filter(job =>
    job.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatus = (status) => {
    if (status === 'completed') return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'var(--success)', color: 'white' }}>
        <CheckCircle size={14} /> Ready
      </div>
    );
    if (status === 'failed') return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'var(--danger)', color: 'white' }}>
        <AlertCircle size={14} /> Failed
      </div>
    );
    return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'var(--warning)', color: 'white' }}>
        <RefreshCw size={14} className="animate-spin" /> Processing
      </div>
    );
  };

  const getDataStats = (job) => {
    if (!job.result) return null;
    return {
      rows: job.result.rows || 0,
      columns: job.result.columns?.length || 0,
      hasCharts: job.charts && job.charts.length > 0
    };
  };

  const renderBasicStats = (job) => {
    const stats = getDataStats(job);
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Total Rows</div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--primary)' }}>{stats.rows.toLocaleString()}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Total Columns</div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--secondary)' }}>{stats.columns}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Status</div>
          <div className="mt-2" style={{ color: 'var(--primary)' }}>{job.status === 'completed' ? '✓ Complete' : 'Processing'}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Charts</div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--accent)' }}>{stats.hasCharts ? job.charts.length : 0}</div>
        </motion.div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Navbar />

      {/* Enhanced Dashboard Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--primary)', color: 'white' }}>
                <BarChart3 size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Data Analytics Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Upload, analyze, and explore your data with AI</p>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Uploads</div>
              <div className="text-2xl font-bold mt-1">{jobs.length}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Completed</div>
              <div className="text-2xl font-bold mt-1">{jobs.filter(j => j.status === 'completed').length}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Processing</div>
              <div className="text-2xl font-bold mt-1">{jobs.filter(j => j.status !== 'completed' && j.status !== 'failed').length}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Failed</div>
              <div className="text-2xl font-bold mt-1">{jobs.filter(j => j.status === 'failed').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        {/* --- Sidebar: Upload & Job List --- */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card sticky top-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload size={24} style={{ color: 'var(--primary)' }} />
              <h3 className="text-xl font-bold">Upload Data</h3>
            </div>
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-opacity-100"
              style={{
                borderColor: isDragActive ? 'var(--primary)' : 'var(--border)',
                background: isDragActive ? 'var(--surface)' : 'var(--surface-secondary)',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <div className="flex flex-col items-center justify-center pt-6 pb-8">
                {uploading ? (
                  <>
                    <RefreshCw size={32} className="animate-spin mb-3" style={{ color: 'var(--primary)' }} />
                    <p className="text-sm font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="mb-3" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm font-semibold">{isDragActive ? 'Drop files to upload' : 'Click or drag files here'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>CSV or Excel files up to 100MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                multiple
              />
            </label>
          </motion.div>

          {/* Job List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card flex-1 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={24} style={{ color: 'var(--primary)' }} />
              <h3 className="text-xl font-bold">Analysis History</h3>
            </div>

            {/* Search/Filter */}
            <div className="mb-4 relative">
              <Search size={18} className="absolute left-3 top-3" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
              />
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading && filteredJobs.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  <p>Loading...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  <FileText size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No files yet</p>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <motion.div
                    key={job.task_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => selectJob(job)}
                    className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: selectedJob?.task_id === job.task_id ? 'var(--surface-secondary)' : 'var(--surface)',
                      borderColor: selectedJob?.task_id === job.task_id ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold truncate text-sm pr-2" title={job.filename}>
                        {job.filename.length > 30 ? job.filename.substring(0, 27) + '...' : job.filename}
                      </h4>
                      {renderStatus(job.status)}
                    </div>
                    <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{job.result?.rows || 0} rows</span>
                      <span>{job.result?.columns?.length || 0} cols</span>
                    </div>
                    {(job.status !== 'completed' && job.status !== 'failed') && (
                      <div className="mt-2">
                        <div className="h-1 w-full rounded-full" style={{ background: 'var(--surface-secondary)' }}>
                          <div className="h-1 rounded-full animate-pulse" style={{ width: '60%', background: 'var(--primary)' }} />
                        </div>
                        <div className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Processing...</div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-3">
                      {(job.status !== 'completed' && job.status !== 'failed') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelJob(job); }}
                          className="p-1.5 rounded-lg hover:shadow-sm"
                          style={{ background: 'var(--surface-secondary)' }}
                          title="Cancel"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameJob(job); }}
                        className="p-1.5 rounded-lg hover:shadow-sm"
                        style={{ background: 'var(--surface-secondary)' }}
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }}
                        className="p-1.5 rounded-lg hover:shadow-sm"
                        style={{ background: 'var(--surface-secondary)' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* --- Main Content: Tabs & Analysis --- */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                {/* Tabs */}
                <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  {['overview', 'preview', 'statistics', 'visualizations', 'insights'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="px-4 py-3 font-medium border-b-2 transition-all text-sm"
                      style={{
                        borderColor: activeTab === tab ? 'var(--primary)' : 'transparent',
                        color: activeTab === tab ? 'var(--primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {tab === 'overview' && 'Overview'}
                      {tab === 'preview' && 'Preview'}
                      {tab === 'statistics' && 'Statistics'}
                      {tab === 'visualizations' && 'Visualizations'}
                      {tab === 'insights' && 'AI Insights'}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {renderBasicStats(selectedJob)}

                    {/* Column Info */}
                    {selectedJob.result?.columns && (
                      <div className="card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <FileText size={20} /> Columns
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedJob.result.columns.map((col, idx) => (
                            <div key={idx} className="p-2 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
                              <p className="text-xs font-medium truncate" title={col}>{col}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="card">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={20} /> Quick Actions
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setActiveTab('preview')}
                          className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all text-left"
                          style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
                        >
                          <FileText size={24} className="mb-2" style={{ color: 'var(--primary)' }} />
                          <p className="font-semibold text-sm">Preview Data</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            First 10 rows
                          </p>
                        </button>
                        <button
                          onClick={() => setActiveTab('visualizations')}
                          className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all text-left"
                          style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
                        >
                          <BarChart2 size={24} className="mb-2" style={{ color: 'var(--primary)' }} />
                          <p className="font-semibold text-sm">View Charts</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {selectedJob.charts?.length || 0} visualizations
                          </p>
                        </button>
                        <button
                          onClick={() => setActiveTab('insights')}
                          className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all text-left"
                          style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
                        >
                          <MessageSquare size={24} className="mb-2" style={{ color: 'var(--primary)' }} />
                          <p className="font-semibold text-sm">Ask AI</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Get insights
                          </p>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tab: Preview */}
                {activeTab === 'preview' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} /> Dataset Preview
                      </h3>
                      {previewLoading && (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
                      )}
                    </div>
                    {previewError && (
                      <p className="text-sm" style={{ color: 'var(--danger)' }}>{previewError}</p>
                    )}
                    {previewData?.rows?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                              {previewData.columns.map((col) => (
                                <th key={col} className="text-left py-2 px-3 font-bold whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.rows.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                {previewData.columns.map((col) => (
                                  <td key={col} className="py-2 px-3 text-xs whitespace-nowrap">
                                    {row[col] === null || row[col] === undefined ? '-' : String(row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : !previewLoading ? (
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No preview available</p>
                    ) : null}
                  </motion.div>
                )}

                {/* Tab: Visualizations */}
                {activeTab === 'visualizations' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {selectedJob.charts && selectedJob.charts.length > 0 ? (
                      <div className="card">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
                              <BarChart2 size={24} /> Data Visualizations
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              Interactive charts generated from your dataset
                            </p>
                          </div>
                          <span className="text-sm px-3 py-1.5 rounded-full font-semibold" style={{ background: 'var(--primary)', color: 'white' }}>
                            {selectedJob.charts.length} Charts
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {selectedJob.charts.map((chart, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              whileHover={{ scale: 1.02, y: -4 }}
                              onClick={() => setExpandedChart(chart)}
                              className="rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:shadow-xl"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <div className="p-3 border-b" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-sm">
                                    {chart.name.includes('countplot') && '📊 Column Value Counts'}
                                    {chart.name.includes('distribution') && '📈 Distribution Analysis'}
                                    {chart.name.includes('heatmap') && '🔥 Correlation Heatmap'}
                                  </p>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadChart(chart); }}
                                    className="p-1.5 rounded-lg hover:shadow-sm"
                                    style={{ background: 'var(--surface)' }}
                                    title="Download"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              </div>
                              <img
                                src={chart.data}
                                alt={chart.title}
                                className="w-full h-auto"
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : selectedJob.status === 'completed' ? (
                      <div className="card text-center py-16">
                        <BarChart2 size={64} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold mb-2">No Visualizations Yet</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
                          Generate beautiful charts from your data analysis
                        </p>
                        <button
                          onClick={() => handleGenerateVisuals(selectedJob)}
                          disabled={analyzingIds.has(selectedJob.task_id)}
                          className="btn btn-primary text-lg px-6 py-3"
                        >
                          {analyzingIds.has(selectedJob.task_id) ? (
                            <>
                              <RefreshCw size={20} className="animate-spin" /> Generating Charts...
                            </>
                          ) : (
                            <>
                              <BarChart2 size={20} /> Generate Visualizations
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="card text-center py-16">
                        <RefreshCw size={64} className="mx-auto mb-4 opacity-20 animate-spin" />
                        <h3 className="text-xl font-bold mb-2">Analysis in Progress</h3>
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          Please wait for the analysis to complete
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Tab: Statistics */}
                {activeTab === 'statistics' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <TrendingUp size={20} /> Descriptive Statistics
                    </h3>
                    {selectedJob.result?.summary ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                              <th className="text-left py-2 px-3 font-bold">Column</th>
                              <th className="text-center py-2 px-3 font-bold">Mean</th>
                              <th className="text-center py-2 px-3 font-bold">Std Dev</th>
                              <th className="text-center py-2 px-3 font-bold">Min</th>
                              <th className="text-center py-2 px-3 font-bold">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedJob.result.summary).map(([col, stats], idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td className="py-2 px-3 font-medium">{col}</td>
                                <td className="py-2 px-3 text-center text-xs">{stats['mean'] ? stats['mean'].toFixed(2) : '-'}</td>
                                <td className="py-2 px-3 text-center text-xs">{stats['std'] ? stats['std'].toFixed(2) : '-'}</td>
                                <td className="py-2 px-3 text-center text-xs">{stats['min'] ? stats['min'].toFixed(2) : '-'}</td>
                                <td className="py-2 px-3 text-center text-xs">{stats['max'] ? stats['max'].toFixed(2) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-tertiary)' }}>No statistics available</p>
                    )}
                  </motion.div>
                )}

                {/* Tab: Insights & Chat */}
                {activeTab === 'insights' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card flex flex-col h-[600px]">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
                      <h3 className="text-lg font-bold">AI Insights</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--surface-secondary)' }}>
                      {chatHistory.length === 0 ? (
                        <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                          <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-semibold mb-2">AI Data Analyst Ready</p>
                          <p className="text-sm">Ask questions about your data analysis</p>
                          <div className="mt-6 flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => setChatMessage("What are the key insights from this data?")}
                              className="text-xs px-3 py-2 rounded-lg hover:shadow-md transition-all"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            >
                              💡 Key Insights
                            </button>
                            <button
                              onClick={() => setChatMessage("Summarize the main statistics")}
                              className="text-xs px-3 py-2 rounded-lg hover:shadow-md transition-all"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            >
                              📊 Summarize Stats
                            </button>
                            <button
                              onClick={() => setChatMessage("What patterns do you see?")}
                              className="text-xs px-3 py-2 rounded-lg hover:shadow-md transition-all"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            >
                              🔍 Find Patterns
                            </button>
                          </div>
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <AIMessage key={idx} message={msg.content} role={msg.role} />
                        ))
                      )}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="flex gap-3">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ background: 'var(--surface-secondary)' }}
                            >
                              <div className="w-4 h-4 border-2 border-transparent rounded-full animate-spin"
                                style={{ borderTopColor: 'var(--primary)', borderRightColor: 'var(--primary)' }}
                              ></div>
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-none shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: '0.4s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Ask a question..."
                        disabled={chatLoading}
                        className="input flex-1 text-sm"
                        style={{ background: 'var(--surface-secondary)' }}
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatMessage.trim()}
                        className="btn btn-primary"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card flex flex-col items-center justify-center h-[400px]"
              >
                <BarChart3 size={48} className="mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">No File Selected</h3>
                <p style={{ color: 'var(--text-tertiary)' }}>Upload a file from the left to get started</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setExpandedChart(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold">{expandedChart.title}</h3>
              <button onClick={() => setExpandedChart(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <img src={expandedChart.data} alt={expandedChart.title} className="w-full h-auto p-4" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
