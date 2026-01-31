import { useState } from 'react';
import { BarChart3, MessageSquare, FileText, TrendingUp, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChartGallery from './ChartGallery';
import AIChatInterface from './AIChatInterface';

const AnalysisResultsViewer = ({ job, onClose }) => {
    const [activeTab, setActiveTab] = useState('summary');

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
        { id: 'insights', label: 'Insights', icon: TrendingUp },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
        { id: 'ask', label: 'Ask AI', icon: MessageSquare },
    ];

    const handleExportPDF = () => {
        // TODO: Implement PDF export
        alert('PDF export will be implemented in Phase 4');
    };

    const handleExportExcel = () => {
        // TODO: Implement Excel export
        alert('Excel export will be implemented in Phase 4');
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

                        {activeTab === 'insights' && (
                            <motion.div
                                key="insights"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                                    <TrendingUp className="h-12 w-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                                    <p className="text-lg font-medium mb-2">AI Insights Coming Soon</p>
                                    <p className="text-sm">
                                        Insight Discovery Agent will be implemented in Phase 2
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'charts' && (
                            <motion.div
                                key="charts"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
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
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default AnalysisResultsViewer;
