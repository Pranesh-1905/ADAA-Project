import { CheckCircle, AlertTriangle, XCircle, TrendingUp, Database } from 'lucide-react';
import { motion } from 'framer-motion';

const DataQualityDashboard = ({ qualityData = {} }) => {
    const {
        quality_score = 0,
        missing_values = {},
        outliers = {},
        quality_issues = [],
        overview = {}
    } = qualityData;

    // Calculate quality score percentage
    const qualityPercentage = Math.round(quality_score * 100);

    // Get quality status
    const getQualityStatus = (score) => {
        if (score >= 0.8) return { label: 'Excellent', color: 'text-green-500', icon: CheckCircle };
        if (score >= 0.6) return { label: 'Good', color: 'text-yellow-500', icon: TrendingUp };
        if (score >= 0.4) return { label: 'Fair', color: 'text-orange-500', icon: AlertTriangle };
        return { label: 'Poor', color: 'text-red-500', icon: XCircle };
    };

    const qualityStatus = getQualityStatus(quality_score);
    const StatusIcon = qualityStatus.icon;

    // Get severity color
    const getSeverityColor = (severity) => {
        const colors = {
            high: 'text-red-500 bg-red-500/10',
            medium: 'text-yellow-500 bg-yellow-500/10',
            low: 'text-blue-500 bg-blue-500/10'
        };
        return colors[severity] || colors.low;
    };

    if (!qualityData || Object.keys(qualityData).length === 0) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                <Database className="h-16 w-16 mx-auto mb-4" style={{ opacity: 0.3 }} />
                <p className="text-lg font-medium">No quality data available</p>
                <p className="text-sm mt-2">Analyze a dataset to see quality metrics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    Data Quality Dashboard
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Comprehensive quality assessment of your dataset
                </p>
            </div>

            {/* Quality Score Gauge */}
            <div className="card-sm">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                            Overall Quality Score
                        </h4>
                        <div className="flex items-center gap-3">
                            <StatusIcon className={`h-8 w-8 ${qualityStatus.color}`} />
                            <div>
                                <div className={`text-4xl font-bold ${qualityStatus.color}`}>
                                    {qualityPercentage}%
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                    {qualityStatus.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Circular Progress */}
                    <div className="relative w-32 h-32">
                        <svg className="transform -rotate-90 w-32 h-32">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="opacity-10"
                                style={{ color: 'var(--text-tertiary)' }}
                            />
                            <motion.circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - quality_score)}`}
                                className={qualityStatus.color}
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - quality_score) }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dataset Overview */}
                <div className="card-sm">
                    <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Dataset Size
                    </h5>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Rows:</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                {overview.rows?.toLocaleString() || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Columns:</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                {overview.columns || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Missing Values */}
                <div className="card-sm">
                    <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Missing Values
                    </h5>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Overall:</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                {((missing_values.overall_missing_percentage || 0) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Affected Cols:</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                {missing_values.columns_affected || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Outliers */}
                <div className="card-sm">
                    <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Outliers Detected
                    </h5>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Columns:</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                {outliers.total_outlier_columns || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quality Issues */}
            {quality_issues && quality_issues.length > 0 && (
                <div className="card-sm">
                    <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                        Quality Issues ({quality_issues.length})
                    </h4>
                    <div className="space-y-3">
                        {quality_issues.map((issue, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-3 rounded-lg ${getSeverityColor(issue.severity)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold uppercase">
                                                {issue.severity} Severity
                                            </span>
                                            {issue.column && (
                                                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-secondary)' }}>
                                                    {issue.column}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium mb-1">
                                            {issue.description}
                                        </p>
                                        {issue.impact && (
                                            <p className="text-xs opacity-75">
                                                Impact: {issue.impact}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Missing Values Breakdown */}
            {missing_values.columns_with_missing && Object.keys(missing_values.columns_with_missing).length > 0 && (
                <div className="card-sm">
                    <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                        Missing Values by Column
                    </h4>
                    <div className="space-y-3">
                        {Object.entries(missing_values.columns_with_missing).map(([column, info]) => (
                            <div key={column}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                        {column}
                                    </span>
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {(info.percentage * 100).toFixed(1)}% ({info.count} values)
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
                                    <motion.div
                                        className={`h-full ${info.severity === 'high' ? 'bg-red-500' :
                                                info.severity === 'medium' ? 'bg-yellow-500' :
                                                    'bg-blue-500'
                                            }`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${info.percentage * 100}%` }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataQualityDashboard;
