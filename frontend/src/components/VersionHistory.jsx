import { useState, useEffect } from 'react';
import { History, RotateCcw, Clock } from 'lucide-react';

const VersionHistory = ({ taskId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadVersions();
    }
  }, [taskId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/api/versions/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!confirm('Restore this version? Current changes will be saved as a new version.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/api/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert('Version restored successfully!');
        loadVersions();
        // Optionally reload the analysis
        window.location.reload();
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-purple-600" size={20} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Version History
        </h3>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading versions...</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500 dark:text-gray-400">No version history available</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Versions will be created automatically as you make changes
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {versions.map((version, index) => (
            <div
              key={version._id}
              className={`border rounded-md p-3 ${
                index === 0
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Version {version.version_number}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={12} className="inline mr-1" />
                    {formatDate(version.created_at)}
                  </p>
                  {version.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      {version.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    By: {version.user}
                  </p>
                </div>
                {index !== 0 && (
                  <button
                    onClick={() => handleRestore(version._id)}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
