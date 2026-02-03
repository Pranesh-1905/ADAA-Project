import { useState } from 'react';
import { BarChart3, MessageSquare, FileText, TrendingUp, Download, X, Lightbulb, Database, Share2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChartGallery from './ChartGallery';
import AIChatInterface from './AIChatInterface';
import InsightsPanel from './InsightsPanel';
import RecommendationsPanel from './RecommendationsPanel';
import DataQualityDashboard from './DataQualityDashboard';
import ShareAnalysisModal from './ShareAnalysisModal';
import CommentsPanel from './CommentsPanel';
// VersionHistory disabled

const AnalysisResultsViewer = ({ job, onClose, onOpenChartBuilder }) => {
    const [activeTab, setActiveTab] = useState('summary');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCollabPanel, setShowCollabPanel] = useState(false);

    if (!job || !job.result) {
        return (
            <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                <p>No analysis results available</p>
            </div>
        );
    }

    const tabs = [
        { id: 'summary', label: 'Summary Stats', icon: FileText },
        { id: 'quality', label: 'Data Quality', icon: Database },
        { id: 'insights', label: 'Insights', icon: TrendingUp },
        { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
        { id: 'ask', label: 'Ask AI', icon: MessageSquare },
        { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
    ];

    const handleExportPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://127.0.0.1:8000/export/pdf/${job.task_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_report_${job.task_id.substring(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to export PDF. Please try again.');
        }
    };

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://127.0.0.1:8000/export/excel/${job.task_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_${job.task_id.substring(0, 8)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel export failed:', error);
            alert('Failed to export Excel. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col card-lg"
                style={{ boxShadow: 'var(--shadow-2xl)' }}
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                            {job.filename}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            {job.result.rows} rows • {job.result.columns?.length} columns
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPDF}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="btn flex items-center gap-2"
                            style={{ background: 'var(--success)', color: 'var(--text-inverse)' }}
                        >
                            <Download className="h-4 w-4" />
                            Excel
                        </button>
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Share2 className="h-4 w-4" />
                            Share
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors btn-ghost"
                        >
                            <X className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b px-6" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id
                                        ? 'text-primary'
                                        : ''
                                        }`}
                                    style={{
                                        borderColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                        color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'summary' && (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Dataset Overview */}
                                <div className="rounded-xl p-6" style={{ background: 'var(--surface-secondary)' }}>
                                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                                        Dataset Overview
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Rows</p>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                                                {job.result.rows?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Columns</p>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                                                {job.result.columns?.length}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Data Types</p>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                                                {job.result.dtypes ? Object.keys(job.result.dtypes).length : 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Status</p>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                                                ✓ Complete
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Columns */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                                        Columns ({job.result.columns?.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {job.result.columns?.map((col, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 card-sm"
                                            >
                                                <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                                                    {col}
                                                </p>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                                    {job.result.dtypes?.[col] || 'unknown'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Statistics */}
                                {job.result.summary && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                                            Statistical Summary
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead style={{ background: 'var(--surface-secondary)' }}>
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text)' }}>
                                                            Metric
                                                        </th>
                                                        {Object.keys(job.result.summary).slice(0, 5).map((col) => (
                                                            <th key={col} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text)' }}>
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                                    {['count', 'mean', 'std', 'min', 'max'].map((metric) => (
                                                        <tr key={metric}>
                                                            <td className="px-4 py-2 font-medium" style={{ color: 'var(--text)' }}>
                                                                {metric}
                                                            </td>
                                                            {Object.keys(job.result.summary).slice(0, 5).map((col) => (
                                                                <td key={col} className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                                                                    {job.result.summary[col]?.[metric] !== undefined
                                                                        ? typeof job.result.summary[col][metric] === 'number'
                                                                            ? job.result.summary[col][metric].toFixed(2)
                                                                            : job.result.summary[col][metric]
                                                                        : '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'quality' && (
                            <motion.div
                                key="quality"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <DataQualityDashboard
                                    qualityData={job.result?.agent_analysis?.profiler || {}}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'insights' && (
                            <motion.div
                                key="insights"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <InsightsPanel
                                    insights={job.result?.agent_analysis?.insights?.insights || []}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'recommendations' && (
                            <motion.div
                                key="recommendations"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <RecommendationsPanel
                                    recommendations={job.result?.agent_analysis?.recommendations?.recommendations || []}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'charts' && (
                            <motion.div
                                key="charts"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                {/* Custom Chart Builder Button */}
                                {onOpenChartBuilder && (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={onOpenChartBuilder}
                                            className="btn btn-primary flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Create Custom Chart
                                        </button>
                                    </div>
                                )}
                                <ChartGallery job={job} />
                            </motion.div>
                        )}

                        {activeTab === 'ask' && (
                            <motion.div
                                key="ask"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <AIChatInterface taskId={job.task_id} />
                            </motion.div>
                        )}

                        {activeTab === 'collaboration' && (
                            <motion.div
                                key="collaboration"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="card">
                                        <CommentsPanel taskId={job.task_id} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Phase 4 Modals */}
            {showShareModal && (
                <ShareAnalysisModal
                    analysisId={job.task_id}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

export default AnalysisResultsViewer;
