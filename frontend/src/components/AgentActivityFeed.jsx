import { useState, useEffect } from 'react';
import { Activity, Bot, TrendingUp, BarChart3, Search, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AgentActivityFeed = ({ taskId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for now - will be replaced with real agent activity in Phase 2
        const mockActivities = [
            {
                id: 1,
                agent: 'Data Profiler Agent',
                action: 'Analyzing data quality',
                status: 'completed',
                timestamp: new Date(Date.now() - 5000).toISOString(),
                icon: Search,
                color: 'blue'
            },
            {
                id: 2,
                agent: 'Insight Discovery Agent',
                action: 'Detecting patterns and trends',
                status: 'completed',
                timestamp: new Date(Date.now() - 3000).toISOString(),
                icon: TrendingUp,
                color: 'purple'
            },
            {
                id: 3,
                agent: 'Visualization Agent',
                action: 'Generating charts',
                status: 'running',
                timestamp: new Date(Date.now() - 1000).toISOString(),
                icon: BarChart3,
                color: 'green'
            }
        ];

        // Simulate loading
        setTimeout(() => {
            setActivities(mockActivities);
            setLoading(false);
        }, 1000);
    }, [taskId]);

    const getAgentColor = (color) => {
        const colors = {
            blue: 'from-blue-500 to-cyan-500',
            purple: 'from-purple-500 to-pink-500',
            green: 'from-green-500 to-emerald-500',
            orange: 'from-orange-500 to-red-500'
        };
        return colors[color] || colors.blue;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'running':
                return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader className="h-8 w-8 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Activity className="h-6 w-6" style={{ color: 'var(--primary)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Agent Activity
                </h3>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-3">
                <AnimatePresence>
                    {activities.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}
                        >
                            <Bot className="h-12 w-12 mx-auto mb-2" style={{ opacity: 0.5 }} />
                            <p className="text-sm">No agent activity yet</p>
                            <p className="text-xs mt-1">Agents will appear here when they start working</p>
                        </motion.div>
                    ) : (
                        activities.map((activity, index) => {
                            const Icon = activity.icon;
                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-start gap-3 p-3 card-sm hover:shadow-md transition-all"
                                >
                                    {/* Agent Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${getAgentColor(activity.color)} flex items-center justify-center`}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>

                                    {/* Activity Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                                                {activity.agent}
                                            </h4>
                                            {getStatusIcon(activity.status)}
                                        </div>
                                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                            {activity.action}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                            {new Date(activity.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`badge ${activity.status === 'completed' ? 'badge-success' : ''
                                        } ${activity.status === 'running' ? 'badge-primary' : ''
                                        } ${activity.status === 'failed' ? 'badge-danger' : ''
                                        }`}>
                                        {activity.status}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Coming Soon Notice */}
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Phase 2:</strong> Real-time agent collaboration will be implemented with live updates from Data Profiler, Insight Discovery, Visualization, Query, and Recommendation agents.
                </p>
            </div>
        </div>
    );
};

export default AgentActivityFeed;
