import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar_new';
import FileUploadZone from '../components/FileUploadZone';
import JobQueuePanel from '../components/JobQueuePanel';
import AnalysisResultsViewer from '../components/AnalysisResultsViewer';
import AgentActivityFeed from '../components/AgentActivityFeed';
import CustomChartBuilder from '../components/CustomChartBuilder';
import ShareAnalysisModal from '../components/ShareAnalysisModal';
import CommentsPanel from '../components/CommentsPanel';
// VersionHistory disabled
import { uploadFile, analyzeFile } from '../api';
import { useToast } from '../context/ToastContext';
import { BarChart3, Activity, Plus, Share2, MessageSquare, History, Search, Lightbulb, Bot, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardNew() {
    const toast = useToast();
    const [selectedJob, setSelectedJob] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showActivityFeed, setShowActivityFeed] = useState(false);
    const [showChartBuilder, setShowChartBuilder] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCollabPanel, setShowCollabPanel] = useState(false);
    const [availableDatasets, setAvailableDatasets] = useState([]);
    const [chartBuilderJob, setChartBuilderJob] = useState(null);

    const handleSaveCustomChart = async (chartData) => {
        try {
            if (!chartBuilderJob) {
                throw new Error('No job selected for chart');
            }

            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:8000/save-custom-chart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task_id: chartBuilderJob.task_id,
                    chart_data: {
                        data: chartData.data,
                        layout: chartData.layout
                    },
                    chart_config: chartData.metadata.config
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to save chart' }));
                throw new Error(errorData.detail);
            }

            const result = await response.json();
            toast.success('Custom chart saved successfully!');

            // Close the chart builder
            setShowChartBuilder(false);
            setChartBuilderJob(null);

            // Refresh to show the new chart
            setRefreshTrigger(prev => prev + 1);

            // If the job is currently selected, update it
            if (selectedJob?.task_id === chartBuilderJob.task_id) {
                // Re-fetch the updated job
                const jobsResponse = await fetch('http://127.0.0.1:8000/jobs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (jobsResponse.ok) {
                    const jobs = await jobsResponse.json();
                    const updatedJob = jobs.find(j => j.task_id === chartBuilderJob.task_id);
                    if (updatedJob) {
                        setSelectedJob(updatedJob);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to save custom chart:', error);
            toast.error(`Failed to save chart: ${error.message}`);
        }
    };

    const handleFilesSelected = async (fileDataArray) => {
        for (const fileData of fileDataArray) {
            try {
                // Upload file
                await uploadFile(fileData.file);
                toast.success(`${fileData.file.name} uploaded successfully`);

                // Start analysis
                const { task_id } = await analyzeFile(fileData.file.name);
                toast.info(`Analysis started for ${fileData.file.name}`);

                // Trigger refresh
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('Failed to upload/analyze file:', error);
                toast.error(`Failed to process ${fileData.file.name}: ${error.message}`);
            }
        }
    };

    const handleJobSelect = (job) => {
        if (job.status === 'completed') {
            setSelectedJob(job);
        }
    };

    // Load available datasets for custom chart builder
    useEffect(() => {
        const loadDatasets = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://127.0.0.1:8000/jobs', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Extract filenames from completed jobs
                    const filenames = data
                        .filter(job => job.status === 'completed' && job.filename)
                        .map(job => job.filename);
                    // Remove duplicates
                    setAvailableDatasets([...new Set(filenames)]);
                }
            } catch (error) {
                console.error('Failed to load datasets:', error);
            }
        };
        loadDatasets();
    }, [refreshTrigger]);

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
            {/* Background Pattern */}
            <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: 'var(--bg-pattern)' }}
            />
            
            <Navbar />

            {/* Header */}
            <div 
                className="border-b relative z-10"
                style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface-glass)',
                    backdropFilter: 'blur(var(--blur-md))',
                    WebkitBackdropFilter: 'blur(var(--blur-md))'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <motion.div 
                                className="p-2 sm:p-3 rounded-xl" 
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
                                    boxShadow: 'var(--shadow-md)' 
                                }}
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: 'var(--text-inverse)' }} />
                            </motion.div>
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">
                                    AI Data Analytics Dashboard
                                </h1>
                                <p style={{ color: 'var(--text-secondary)' }} className="mt-1 text-xs sm:text-sm">
                                    Upload, analyze, and explore your data with AI-powered insights
                                </p>
                            </div>
                        </div>

                        <motion.button
                            onClick={() => setShowActivityFeed(!showActivityFeed)}
                            className={`btn btn-sm sm:btn ${showActivityFeed ? 'btn-primary' : 'btn-secondary'} w-full sm:w-auto`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Toggle agent activity feed"
                        >
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline">Agent Activity</span>
                            <span className="sm:hidden">Activity</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full relative z-10">
                <div className="space-y-4 sm:space-y-6">
                    {/* Top Row: Upload & Welcome */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Upload Dataset */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -2 }}
                            className="card h-full"
                        >
                            <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                                Upload Dataset
                            </h2>
                            <FileUploadZone onFilesSelected={handleFilesSelected} />
                        </motion.div>

                        {/* Welcome / Activity Feed */}
                        <AnimatePresence mode="wait">
                            {showActivityFeed ? (
                                <motion.div
                                    key="activity"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="card h-full"
                                >
                                    <AgentActivityFeed taskId={selectedJob?.task_id} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="welcome"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="card h-full flex items-center justify-center"
                                    style={{
                                        background: 'var(--surface-secondary)',
                                        border: '2px dashed var(--border)'
                                    }}
                                >
                                    <div className="max-w-xl text-center px-4">
                                        <div className="inline-flex p-3 rounded-xl mb-3" style={{
                                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                                            boxShadow: 'var(--shadow-lg)'
                                        }}>
                                            <BarChart3 className="h-10 w-10" style={{ color: 'var(--text-inverse)' }} />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                                            Welcome to AI Data Analytics
                                        </h2>
                                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                            Upload a CSV or Excel file to get started. Our AI agents will automatically analyze your data.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 text-left">
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="mb-2">
                                                    <Search className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                                                </div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Profile Data
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Quality & types
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="mb-2">
                                                    <Lightbulb className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                                                </div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Find Insights
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Patterns & trends
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="mb-2">
                                                    <BarChart3 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                                                </div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Create Charts
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Auto visualizations
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="mb-2">
                                                    <Bot className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                                                </div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Get Advice
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Smart recommendations
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Bottom Row: Job Queue (Full Width) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                    >
                        <JobQueuePanel
                            onJobSelect={handleJobSelect}
                            refreshTrigger={refreshTrigger}
                        />
                    </motion.div>

                    {/* Collaboration Panel - Show when a job is selected */}
                    {selectedJob && showCollabPanel && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            <div className="card">
                                <CommentsPanel taskId={selectedJob.task_id} />
                            </div>
                        </motion.div>
                    )}

                    {/* Phase 4 Action Buttons - Show when job selected */}
                    {selectedJob && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap gap-3"
                        >
                            <button
                                onClick={() => setShowChartBuilder(true)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Create Custom Chart
                            </button>
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Share2 className="h-4 w-4" />
                                Share Analysis
                            </button>
                            <button
                                onClick={() => setShowCollabPanel(!showCollabPanel)}
                                className={`btn ${showCollabPanel ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                {showCollabPanel ? 'Hide' : 'Show'} Collaboration
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Analysis Results Modal */}
            <AnimatePresence>
                {selectedJob && (
                    <AnalysisResultsViewer
                        job={selectedJob}
                        onClose={() => setSelectedJob(null)}
                        onOpenChartBuilder={() => {
                            setChartBuilderJob(selectedJob);
                            setShowChartBuilder(true);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Phase 4 Modals */}
            {showChartBuilder && chartBuilderJob && (
                <CustomChartBuilder
                    datasets={[chartBuilderJob.filename]}
                    selectedDataset={chartBuilderJob.filename}
                    onSave={handleSaveCustomChart}
                    onClose={() => {
                        setShowChartBuilder(false);
                        setChartBuilderJob(null);
                    }}
                />
            )}

            {showShareModal && selectedJob && (
                <ShareAnalysisModal
                    analysisId={selectedJob.task_id}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
}
