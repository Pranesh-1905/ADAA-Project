import { useState } from 'react';
import { Lightbulb, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RecommendationsPanel = ({ recommendations = [] }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('all');

    // Extract recommendations from agent results
    const allRecommendations = recommendations || [];

    // Filter recommendations
    const filteredRecommendations = allRecommendations.filter(rec => {
        if (filter === 'all') return true;
        return rec.priority === filter;
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    });

    const getPriorityColor = (priority) => {
        const colors = {
            critical: 'from-red-500 to-red-600',
            high: 'from-orange-500 to-orange-600',
            medium: 'from-yellow-500 to-yellow-600',
            low: 'from-green-500 to-green-600'
        };
        return colors[priority] || colors.medium;
    };

    const getPriorityIcon = (priority) => {
        if (priority === 'critical' || priority === 'high') return AlertTriangle;
        if (priority === 'medium') return Info;
        return CheckCircle2;
    };

    const getImpactBadge = (impact) => {
        const colors = {
            high: 'badge-success',
            medium: 'badge-warning',
            low: 'badge-secondary'
        };
        return colors[impact] || 'badge-secondary';
    };

    const getEffortBadge = (effort) => {
        const colors = {
            low: 'badge-success',
            medium: 'badge-warning',
            high: 'badge-danger'
        };
        return colors[effort] || 'badge-secondary';
    };

    if (!allRecommendations || allRecommendations.length === 0) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                <Lightbulb className="h-16 w-16 mx-auto mb-4" style={{ opacity: 0.3 }} />
                <p className="text-lg font-medium">No recommendations yet</p>
                <p className="text-sm mt-2">Analyze a dataset to get actionable recommendations</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                        Recommendations
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {sortedRecommendations.length} actionable recommendations
                    </p>
                </div>
            </div>

            {/* Priority Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {['all', 'critical', 'high', 'medium', 'low'].map(priority => (
                    <button
                        key={priority}
                        onClick={() => setFilter(priority)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === priority
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                                : 'hover:bg-opacity-10'
                            }`}
                        style={{
                            background: filter === priority ? undefined : 'var(--surface-secondary)',
                            color: filter === priority ? undefined : 'var(--text-secondary)'
                        }}
                    >
                        {priority}
                    </button>
                ))}
            </div>

            {/* Recommendations List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {sortedRecommendations.map((rec, index) => {
                        const Icon = getPriorityIcon(rec.priority);
                        const isExpanded = expandedId === rec.id || expandedId === index;

                        return (
                            <motion.div
                                key={rec.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="card-sm hover:shadow-lg transition-all"
                            >
                                {/* Header */}
                                <div
                                    className="flex items-start gap-4 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : (rec.id || index))}
                                >
                                    {/* Priority Indicator */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${getPriorityColor(rec.priority)} flex items-center justify-center`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
                                                    {rec.title}
                                                </h4>
                                                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                                    {rec.description}
                                                </p>
                                            </div>

                                            {/* Expand Icon */}
                                            <div className="flex-shrink-0">
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`badge capitalize ${getPriorityColor(rec.priority).replace('from-', 'bg-').split(' ')[0]}`}>
                                                {rec.priority} Priority
                                            </span>
                                            {rec.category && (
                                                <span className="badge badge-primary capitalize">
                                                    {rec.category.replace('_', ' ')}
                                                </span>
                                            )}
                                            {rec.estimated_impact && (
                                                <span className={`badge ${getImpactBadge(rec.estimated_impact)} capitalize`}>
                                                    {rec.estimated_impact} Impact
                                                </span>
                                            )}
                                            {rec.effort && (
                                                <span className={`badge ${getEffortBadge(rec.effort)} capitalize`}>
                                                    {rec.effort} Effort
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 pt-4 border-t"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            {/* Action */}
                                            {rec.action && (
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                                                        Recommended Action:
                                                    </h5>
                                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        {rec.action}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Steps */}
                                            {rec.steps && rec.steps.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                                                        Action Steps:
                                                    </h5>
                                                    <ol className="list-decimal list-inside space-y-2">
                                                        {rec.steps.map((step, idx) => (
                                                            <li key={idx} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {sortedRecommendations.length === 0 && filter !== 'all' && (
                <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                    <p>No {filter} priority recommendations found</p>
                </div>
            )}
        </div>
    );
};

export default RecommendationsPanel;
