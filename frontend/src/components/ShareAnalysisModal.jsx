import { useState } from 'react';
import { Share2, Users, X, Check } from 'lucide-react';

const ShareAnalysisModal = ({ analysisId, onClose, onShare }) => {
  const [usernames, setUsernames] = useState('');
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleShare = async () => {
    if (!usernames.trim()) {
      setMessage({ type: 'error', text: 'Please enter at least one username' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const usernameList = usernames.split(',').map(u => u.trim()).filter(u => u);

      const response = await fetch('http://127.0.0.1:8000/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          task_id: analysisId,
          shared_with: usernameList,
          permission: permission
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          onShare && onShare();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        let errorMsg = 'Failed to share analysis';
        
        // Handle validation errors (422)
        if (error.detail) {
          if (Array.isArray(error.detail)) {
            // FastAPI validation errors are arrays
            errorMsg = error.detail.map(e => e.msg || e).join(', ');
          } else if (typeof error.detail === 'string') {
            errorMsg = error.detail;
          }
        }
        
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Share2 className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Share Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {message && (
            <div className={`p-3 rounded-md flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Share with (usernames)
            </label>
            <input
              type="text"
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              placeholder="user1, user2, user3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple usernames with commas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Permission Level
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="view">View Only</option>
              <option value="edit">View & Edit</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Share2 size={16} />
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareAnalysisModal;
