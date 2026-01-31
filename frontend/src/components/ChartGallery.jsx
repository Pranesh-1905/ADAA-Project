import { useState, useEffect } from 'react';
import { X, ZoomIn, Download, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const ChartGallery = ({ job }) => {
    const [charts, setCharts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedChart, setSelectedChart] = useState(null);
    const [generatingCharts, setGeneratingCharts] = useState(false);

    useEffect(() => {
        if (job?.charts && job.charts.length > 0) {
            setCharts(job.charts);
        }
    }, [job]);

    const handleGenerateCharts = async () => {
        setGeneratingCharts(true);
        try {
            const response = await api.get(`/visualize/${job.task_id}`);
            // Poll for chart completion
            const pollInterval = setInterval(async () => {
                const jobResponse = await api.get(`/jobs`);
                const updatedJob = Array.isArray(jobResponse) ? jobResponse.find(j => j.task_id === job.task_id) : null;
                if (updatedJob?.charts) {
                    setCharts(updatedJob.charts);
                    setGeneratingCharts(false);
                    clearInterval(pollInterval);
                }
            }, 2000);

            // Stop polling after 30 seconds
            setTimeout(() => {
                clearInterval(pollInterval);
                setGeneratingCharts(false);
            }, 30000);
        } catch (error) {
            console.error('Failed to generate charts:', error);
            setGeneratingCharts(false);
        }
    };

    const handleDownloadChart = (chart) => {
        const link = document.createElement('a');
        link.href = chart.data;
        link.download = `${chart.name || 'chart'}.png`;
        link.click();
    };

    if (charts.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="mb-6">
                    <svg
                        className="h-24 w-24 mx-auto text-gray-400 dark:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    No Charts Generated Yet
                </h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Generate visualizations to explore your data
                </p>
                <button
                    onClick={handleGenerateCharts}
                    disabled={generatingCharts}
                    className="btn btn-primary"
                >
                    {generatingCharts ? 'Generating Charts...' : 'Generate Charts'}
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Chart Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {charts.map((chart, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="card overflow-hidden group hover:shadow-lg transition-all"
                    >
                        <div className="relative">
                            <img
                                src={chart.data}
                                alt={chart.title || 'Chart'}
                                className="w-full h-48 object-contain bg-white p-4 cursor-pointer"
                                onClick={() => setSelectedChart(chart)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setSelectedChart(chart)}
                                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                    title="View Full Size"
                                >
                                    <Maximize2 className="h-5 w-5 text-gray-900" />
                                </button>
                                <button
                                    onClick={() => handleDownloadChart(chart)}
                                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Download Chart"
                                >
                                    <Download className="h-5 w-5 text-gray-900" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-semibold" style={{ color: 'var(--text)' }}>
                                {chart.title || chart.name}
                            </h4>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Full Screen Modal */}
            <AnimatePresence>
                {selectedChart && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedChart(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="relative max-w-6xl max-h-[90vh] rounded-xl overflow-hidden card-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10 flex items-center justify-between">
                                <h3 className="text-white font-semibold text-lg">
                                    {selectedChart.title || selectedChart.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownloadChart(selectedChart)}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <Download className="h-5 w-5 text-white" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedChart(null)}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                        title="Close"
                                    >
                                        <X className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Chart Image */}
                            <img
                                src={selectedChart.data}
                                alt={selectedChart.title || 'Chart'}
                                className="w-full h-full object-contain p-8"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChartGallery;
