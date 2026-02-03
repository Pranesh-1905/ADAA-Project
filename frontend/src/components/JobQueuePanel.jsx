import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader, Trash2, X as XIcon, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { NoDataState } from './EmptyStates';
import { Spinner } from './LoadingStates';

const JobQueuePanel = ({ onJobSelect, refreshTrigger }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, running, completed, failed
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 3000); // Auto-refresh every 3 seconds
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const fetchJobs = async () => {
        try {
            const response = await api.get('/jobs');
            setJobs(response || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            setJobs([]);
            setLoading(false);
        }
    };

    const handleDelete = async (taskId, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this job?')) return;

        try {
            await api.delete(`/jobs/${taskId}`);
            setJobs(prev => prev.filter(job => job.task_id !== taskId));
        } catch (error) {
            console.error('Failed to delete job:', error);
            alert('Failed to delete job');
        }
    };

    const handleCancel = async (taskId, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to cancel this job?')) return;

        try {
            await api.post(`/jobs/${taskId}/cancel`);
            fetchJobs(); // Refresh to show updated status
        } catch (error) {
            console.error('Failed to cancel job:', error);
            alert('Failed to cancel job');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'processing':
                return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
            default:
                return <Clock className="h-5 w-5 text-yellow-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
            case 'failed':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
            case 'processing':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
        }
    };

    const filteredJobs = jobs.filter(job => {
        const matchesFilter = filter === 'all' || job.status === filter;
        const matchesSearch = job.filename?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getFilterCount = (filterType) => {
        if (filterType === 'all') return jobs.length;
        return jobs.filter(job => job.status === filterType).length;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <NoDataState message="No analysis jobs yet. Upload a file to get started!" />
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    Job Queue
                </h2>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                </span>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
            />

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'processing', 'completed', 'failed'].map((filterType) => (
                    <button
                        key={filterType}
                        onClick={() => setFilter(filterType)}
                        className={`btn btn-sm ${filter === filterType
                            ? 'btn-primary'
                            : 'btn-secondary'
                            }`}
                    >
                        {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            {getFilterCount(filterType)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Job List */}
            <div className="overflow-x-auto -mx-2 px-2 custom-scrollbar">
                <AnimatePresence>
                    {filteredJobs.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}
                        >
                            <Clock className="h-10 w-10 mx-auto mb-3" style={{ opacity: 0.5 }} />
                            <p className="text-sm">No jobs found</p>
                        </motion.div>
                    ) : (
                        <div className="flex gap-3 pb-2">
                            {filteredJobs.map((job, index) => (
                                <motion.div
                                    key={job.task_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => onJobSelect && onJobSelect(job)}
                                    className="flex-shrink-0 w-64 p-3 card-sm hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className="mt-0.5">
                                            {getStatusIcon(job.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                                                {job.filename || 'Unnamed Job'}
                                            </h3>
                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${getStatusColor(job.status)}`}>
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>

                                    {job.result && (
                                        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                                            {job.result.rows} rows • {job.result.columns?.length} cols
                                        </p>
                                    )}

                                    {/* Progress Bar for Processing Jobs */}
                                    {job.status === 'processing' && (
                                        <div className="mb-2 w-full rounded-full h-1" style={{ background: 'var(--surface-tertiary)' }}>
                                            <motion.div
                                                className="h-1 rounded-full"
                                                style={{ background: 'var(--primary)' }}
                                                initial={{ width: '0%' }}
                                                animate={{ width: '70%' }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {job.error && (
                                        <p className="mb-2 text-xs line-clamp-2" style={{ color: 'var(--danger)' }}>
                                            {job.error}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                        {job.status === 'completed' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onJobSelect && onJobSelect(job);
                                                }}
                                                className="flex-1 px-2 py-1 btn btn-primary text-xs"
                                            >
                                                <Eye className="h-3 w-3 inline mr-1" />
                                                View
                                            </button>
                                        )}
                                        {job.status === 'processing' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(job.task_id, e);
                                                }}
                                                className="flex-1 px-2 py-1 btn btn-secondary text-xs"
                                            >
                                                <XIcon className="h-3 w-3 inline mr-1" />
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(job.task_id, e);
                                            }}
                                            className="px-2 py-1 btn btn-secondary text-xs"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default JobQueuePanel;
