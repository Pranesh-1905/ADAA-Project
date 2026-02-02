import { useState } from 'react';
import { TrendingUp, AlertCircle, Target, Zap, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InsightsPanel = ({ insights = [] }) => {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('confidence');

    // Extract insights from agent results
    const allInsights = insights || [];

    // Filter insights
    const filteredInsights = allInsights.filter(insight => {
        if (filter === 'all') return true;
        return insight.type === filter;
    });

    // Sort insights
    const sortedInsights = [...filteredInsights].sort((a, b) => {
        if (sortBy === 'confidence') {
            return (b.confidence || 0) - (a.confidence || 0);
        }
        return 0;
    });

    const getInsightIcon = (type) => {
        const icons = {
            correlation: TrendingUp,
            trend: TrendingUp,
            anomaly: AlertCircle,
            pattern: Target,
            other: Zap
        };
        return icons[type] || Zap;
    };

    const getInsightColor = (type) => {
        const colors = {
            correlation: 'from-purple-500 to-pink-500',
            trend: 'from-blue-500 to-cyan-500',
            anomaly: 'from-red-500 to-orange-500',
            pattern: 'from-green-500 to-emerald-500',
            other: 'from-yellow-500 to-orange-500'
        };
        return colors[type] || colors.other;
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'text-green-500';
        if (confidence >= 0.6) return 'text-yellow-500';
        return 'text-orange-500';
    };

    const insightTypes = [
        { value: 'all', label: 'All Insights' },
        { value: 'correlation', label: 'Correlations' },
        { value: 'trend', label: 'Trends' },
        { value: 'anomaly', label: 'Anomalies' },
        { value: 'pattern', label: 'Patterns' }
    ];

    if (!allInsights || allInsights.length === 0) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                <Zap className="h-16 w-16 mx-auto mb-4" style={{ opacity: 0.3 }} />
                <p className="text-lg font-medium">No insights discovered yet</p>
                <p className="text-sm mt-2">Upload and analyze a dataset to see insights</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                        Discovered Insights
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {sortedInsights.length} insights found
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Filter:
                    </span>
                </div>
                {insightTypes.map(type => (
                    <button
                        key={type.value}
                        onClick={() => setFilter(type.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === type.value
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'hover:bg-opacity-10'
                            }`}
                        style={{
                            background: filter === type.value ? undefined : 'var(--surface-secondary)',
                            color: filter === type.value ? undefined : 'var(--text-secondary)'
                        }}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {sortedInsights.map((insight, index) => {
                        const Icon = getInsightIcon(insight.type);
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="card-sm hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${getInsightColor(insight.type)} flex items-center justify-center`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
                                                    {insight.title}
                                                </h4>
                                                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                                    {insight.description}
                                                </p>
                                            </div>

                                            {/* Confidence Score */}
                                            {insight.confidence !== undefined && (
                                                <div className="flex-shrink-0 text-right">
                                                    <div className={`text-2xl font-bold ${getConfidenceColor(insight.confidence)}`}>
                                                        {Math.round(insight.confidence * 100)}%
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                                        Confidence
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="badge badge-primary capitalize">
                                                {insight.type}
                                            </span>
                                            {insight.actionable && (
                                                <span className="badge badge-success">
                                                    Actionable
                                                </span>
                                            )}
                                        </div>

                                        {/* Evidence */}
                                        {insight.evidence && (
                                            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                                    Evidence:
                                                </p>
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {JSON.stringify(insight.evidence, null, 2)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {sortedInsights.length === 0 && filter !== 'all' && (
                <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                    <p>No {filter} insights found</p>
                </div>
            )}
        </div>
    );
};

export default InsightsPanel;
