import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIMessage({ message, role }) {
  const isUser = role === 'user';
  const isError = role === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: isUser
              ? 'var(--primary)'
              : isError
              ? 'var(--danger)'
              : 'var(--surface-secondary)',
          }}
        >
          {isUser ? (
            <User size={16} style={{ color: 'white' }} />
          ) : (
            <Bot size={16} style={{ color: isError ? 'white' : 'var(--primary)' }} />
          )}
        </div>

        {/* Message Content */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser ? 'rounded-tr-none' : 'rounded-tl-none'
          }`}
          style={{
            background: isUser
              ? 'var(--primary)'
              : isError
              ? 'var(--danger)'
              : 'var(--surface)',
            color: isUser || isError ? 'white' : 'var(--text)',
            border: isUser || isError ? 'none' : '1px solid var(--border)',
          }}
        >
          {isUser || isError ? (
            <p className="text-sm leading-relaxed">{message}</p>
          ) : (
            <div className="ai-markdown prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize markdown elements
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed" style={{ color: 'var(--text)' }}>
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ color: 'var(--primary)', fontWeight: '600' }}>
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ color: 'var(--text-secondary)' }}>{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed" style={{ color: 'var(--text)' }}>
                      {children}
                    </li>
                  ),
                  code: ({ inline, children, ...props }) =>
                    inline ? (
                      <code
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: 'var(--surface-secondary)',
                          color: 'var(--primary)',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="block p-3 rounded-lg text-xs font-mono overflow-x-auto"
                        style={{
                          background: 'var(--surface-secondary)',
                          color: 'var(--text)',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  pre: ({ children }) => <div className="mb-2">{children}</div>,
                  blockquote: ({ children }) => (
                    <blockquote
                      className="border-l-4 pl-4 py-1 italic mb-2"
                      style={{
                        borderColor: 'var(--primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>
                      {children}
                    </h3>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-2">
                      <table
                        className="min-w-full text-xs border"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th
                      className="px-3 py-2 text-left font-semibold border-b"
                      style={{
                        background: 'var(--surface-secondary)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td
                      className="px-3 py-2 border-b"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {children}
                    </td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      {children}
                    </a>
                  ),
                  hr: () => (
                    <hr className="my-3" style={{ borderColor: 'var(--border)' }} />
                  ),
                }}
              >
                {message}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
