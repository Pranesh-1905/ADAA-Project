import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Bot, User, Cpu, BarChart3, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../api';

const AIChatInterface = ({ taskId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        const questionText = input;
        setInput('');
        setLoading(true);

        try {
            // Use the new Query Agent endpoint
            const response = await api.queryAgent(questionText, taskId);

            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.answer,
                timestamp: new Date().toISOString(),
                confidence: response.confidence,
                source: response.source,
                model: response.model,
                note: response.note
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Failed to get AI response:', error);
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: error.message || 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[600px] rounded-xl border" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                    >
                        <motion.div
                            className="inline-flex p-4 rounded-2xl mb-4"
                            style={{ background: 'var(--primary-bg)' }}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <Bot className="h-12 w-12" style={{ color: 'var(--primary)' }} />
                        </motion.div>
                        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                            Ask me anything about your data
                        </p>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            I can help you understand patterns, trends, and insights
                        </p>
                        <div className="space-y-2 max-w-md mx-auto">
                            {[
                                'What are the main trends in this dataset?',
                                'Are there any outliers or anomalies?',
                                'What correlations exist between columns?'
                            ].map((suggestion, idx) => (
                                <motion.button
                                    key={idx}
                                    onClick={() => setInput(suggestion)}
                                    className="w-full px-4 py-3 rounded-lg text-sm text-left transition-all"
                                    style={{ 
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)'
                                    }}
                                    whileHover={{ 
                                        scale: 1.02,
                                        borderColor: 'var(--primary)',
                                        color: 'var(--text)'
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    aria-label={`Suggestion: ${suggestion}`}
                                >
                                    {suggestion}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                            )}

                            <div
                                className="max-w-[80%] rounded-2xl px-4 py-3"
                                style={{
                                    background: message.role === 'user' ? 'var(--primary)' : message.isError ? 'var(--danger)' : 'var(--surface)',
                                    color: message.role === 'user' ? 'var(--text-inverse)' : 'var(--text)',
                                    border: message.role === 'assistant' && !message.isError ? '1px solid var(--border)' : 'none',
                                    boxShadow: message.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                                    opacity: message.isError ? 0.9 : 1
                                }}
                            >
                                {message.role === 'user' ? (
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                ) : (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--surface-tertiary)' }} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Metadata footer */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <p className="text-xs opacity-70">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>

                                    {/* Show confidence and source for assistant messages */}
                                    {message.role === 'assistant' && !message.isError && (
                                        <>
                                            {message.confidence !== undefined && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{
                                                        background: message.confidence > 0.7 ? 'var(--success-bg)' : 'var(--warning-bg)',
                                                        color: message.confidence > 0.7 ? 'var(--success)' : 'var(--warning)'
                                                    }}
                                                >
                                                    {Math.round(message.confidence * 100)}% confident
                                                </span>
                                            )}

                                            {message.source && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{
                                                        background: message.source === 'llm' ? 'var(--primary-bg)' : 'var(--surface-tertiary)',
                                                        color: message.source === 'llm' ? 'var(--primary)' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        {message.source === 'llm' ? (
                                                            <>
                                                                <Cpu className="h-3 w-3" />
                                                                AI-Powered
                                                            </>
                                                        ) : (
                                                            <>
                                                                <BarChart3 className="h-3 w-3" />
                                                                Rule-Based
                                                            </>
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Show note if available */}
                                {message.note && (
                                    <p className="text-xs mt-2 opacity-60 italic flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        {message.note}
                                    </p>
                                )}
                            </div>

                            {message.role === 'user' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="card-sm">
                            <div className="flex items-center gap-2">
                                <Loader className="h-4 w-4 animate-spin" style={{ color: 'var(--primary)' }} />
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question about your data..."
                        rows={1}
                        className="textarea flex-1 resize-none"
                        style={{ minHeight: 'auto', height: 'auto' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
};

export default AIChatInterface;
