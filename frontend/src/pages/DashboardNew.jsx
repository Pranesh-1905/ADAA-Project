import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import FileUploadZone from '../components/FileUploadZone';
import JobQueuePanel from '../components/JobQueuePanel';
import AnalysisResultsViewer from '../components/AnalysisResultsViewer';
import AgentActivityFeed from '../components/AgentActivityFeed';
import { uploadFile, analyzeFile } from '../api';
import { BarChart3, Activity } from 'lucide-react';

export default function DashboardNew() {
    const [selectedJob, setSelectedJob] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showActivityFeed, setShowActivityFeed] = useState(false);

    const handleFilesSelected = async (fileDataArray) => {
        for (const fileData of fileDataArray) {
            try {
                // Upload file
                await uploadFile(fileData.file);

                // Start analysis
                const { task_id } = await analyzeFile(fileData.file.name);

                // Trigger refresh
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('Failed to upload/analyze file:', error);
                alert(`Failed to process ${fileData.file.name}: ${error.message}`);
            }
        }
    };

    const handleJobSelect = (job) => {
        if (job.status === 'completed') {
            setSelectedJob(job);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
            <Navbar />

            {/* Header */}
            <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', boxShadow: 'var(--shadow-md)' }}>
                                <BarChart3 className="h-8 w-8" style={{ color: 'var(--text-inverse)' }} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold gradient-text">
                                    AI Data Analytics Dashboard
                                </h1>
                                <p style={{ color: 'var(--text-secondary)' }} className="mt-1">
                                    Upload, analyze, and explore your data with AI-powered insights
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowActivityFeed(!showActivityFeed)}
                            className={`btn ${showActivityFeed ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Activity className="h-5 w-5" />
                            Agent Activity
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
                <div className="space-y-6">
                    {/* Top Row: Upload & Welcome */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upload Dataset */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card h-full"
                        >
                            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>
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
                                                <div className="text-xl mb-1">🔍</div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Profile Data
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Quality & types
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="text-xl mb-1">💡</div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Find Insights
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Patterns & trends
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="text-xl mb-1">📊</div>
                                                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                                                    Create Charts
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    Auto visualizations
                                                </p>
                                            </div>
                                            <div className="card-sm p-3" style={{ background: 'var(--surface)' }}>
                                                <div className="text-xl mb-1">🤖</div>
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
                </div>
            </div>

            {/* Analysis Results Modal */}
            <AnimatePresence>
                {selectedJob && (
                    <AnalysisResultsViewer
                        job={selectedJob}
                        onClose={() => setSelectedJob(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
