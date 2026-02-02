import { useState, useEffect } from 'react';
import { Activity, Bot, TrendingUp, BarChart3, Search, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AgentActivityFeed = ({ taskId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!taskId) {
            setLoading(false);
            return;
        }

        let eventSource = null;
        let reconnectTimeout = null;

        const connectToStream = () => {
            try {
                // Get auth token
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('No authentication token found');
                    setError('Not authenticated');
                    setLoading(false);
                    return;
                }

                // Create EventSource connection
                const url = `http://127.0.0.1:8000/api/analysis/${taskId}/stream?token=${token}`;
                console.log('Connecting to SSE:', url.replace(token, 'TOKEN_HIDDEN'));
                eventSource = new EventSource(url);

                eventSource.onopen = () => {
                    console.log('SSE connection established');
                    setConnected(true);
                    setLoading(false);
                    setError(null);
                };

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'connected') {
                            console.log('Connected to task:', data.task_id);
                            return;
                        }

                        if (data.type === 'error') {
                            setError(data.message);
                            return;
                        }

                        // Add new activity to the list
                        setActivities(prev => {
                            // Avoid duplicates by checking timestamp + agent_name
                            const isDuplicate = prev.some(
                                a => a.timestamp === data.timestamp && a.agent_name === data.agent_name
                            );
                            if (isDuplicate) return prev;

                            return [...prev, {
                                id: `${data.agent_name}-${data.timestamp}`,
                                agent: data.agent_name,
                                action: data.action,
                                status: data.status,
                                timestamp: data.timestamp,
                                details: data.details,
                                icon: getIconForAgent(data.agent_name),
                                color: getColorForAgent(data.agent_name)
                            }];
                        });
                    } catch (err) {
                        console.error('Error parsing SSE message:', err);
                    }
                };

                eventSource.onerror = (err) => {
                    console.error('SSE error:', err);
                    setConnected(false);

                    // Close the connection
                    if (eventSource) {
                        eventSource.close();
                    }

                    // Attempt to reconnect after 3 seconds
                    reconnectTimeout = setTimeout(() => {
                        console.log('Attempting to reconnect...');
                        connectToStream();
                    }, 3000);
                };

            } catch (err) {
                console.error('Failed to connect to SSE:', err);
                setError('Failed to connect to event stream');
                setLoading(false);
            }
        };

        // Helper function to map agent names to icons
        const getIconForAgent = (agentName) => {
            const iconMap = {
                'data_profiler': Search,
                'insight_discovery': TrendingUp,
                'visualization': BarChart3,
                'recommendation': Bot
            };
            return iconMap[agentName] || Activity;
        };

        // Helper function to map agent names to colors
        const getColorForAgent = (agentName) => {
            const colorMap = {
                'data_profiler': 'blue',
                'insight_discovery': 'purple',
                'visualization': 'green',
                'recommendation': 'orange'
            };
            return colorMap[agentName] || 'blue';
        };

        connectToStream();

        // Cleanup on unmount
        return () => {
            if (eventSource) {
                eventSource.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        };
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
            {error && (
                <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-sm text-red-500">
                        <strong>Error:</strong> {error}
                    </p>
                </div>
            )}

            {!error && (
                <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <strong>Real-time updates:</strong> {connected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentActivityFeed;
