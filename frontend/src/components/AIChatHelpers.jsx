// Helper functions for AI Chat Interface

export const getIntentBadge = (intent) => {
    const badges = {
        'dataset_size': { label: 'Dataset Info', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        'columns': { label: 'Columns', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
        'missing_values': { label: 'Missing Data', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        'data_quality': { label: 'Quality', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
        'outliers': { label: 'Outliers', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        'insights': { label: 'Insights', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
        'correlations': { label: 'Correlations', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
        'recommendations': { label: 'Recommendations', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        'charts': { label: 'Charts', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
        'summary': { label: 'Summary', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
        'statistics': { label: 'Statistics', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
        'comparison': { label: 'Comparison', color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
    };
    return badges[intent] || { label: 'General', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
};

export const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-orange-400';
};

export const TypingIndicator = () => (
    <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
);

export const MessageMetadata = ({ metadata }) => {
    if (!metadata) return null;

    const badge = metadata.intent ? getIntentBadge(metadata.intent) : null;
    const confidenceColor = metadata.confidence ? getConfidenceColor(metadata.confidence) : null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-700/30">
            {badge && (
                <span className={`text-xs px-2 py-1 rounded-full border ${badge.color}`}>
                    {badge.label}
                </span>
            )}
            {metadata.confidence && (
                <span className={`text-xs flex items-center gap-1 ${confidenceColor}`}>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {(metadata.confidence * 100).toFixed(0)}% confident
                </span>
            )}
            {metadata.from_cache && (
                <span className="text-xs px-2 py-1 rounded-full border bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cached
                </span>
            )}
        </div>
    );
};
