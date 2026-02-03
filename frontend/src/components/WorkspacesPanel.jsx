import { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, UserMinus, X } from 'lucide-react';

const WorkspacesPanel = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    members: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim()) {
      alert('Workspace name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const membersList = newWorkspace.members
        .split(',')
        .map(m => m.trim())
        .filter(m => m);

      const response = await fetch('http://127.0.0.1:8000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newWorkspace.name,
          description: newWorkspace.description,
          members: membersList
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewWorkspace({ name: '', description: '', members: '' });
        loadWorkspaces();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Workspaces
          </h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          New Workspace
        </button>
      </div>

      {/* Workspaces List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No workspaces yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Create a workspace to collaborate with your team
            </p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <div
              key={workspace._id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {workspace.name}
              </h3>
              {workspace.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {workspace.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Users size={14} />
                <span>{workspace.members?.length || 0} members</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Owner: {workspace.owner}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Created: {formatDate(workspace.created_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Create New Workspace
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  placeholder="Marketing Team"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  placeholder="Workspace for marketing analytics"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Members (usernames)
                </label>
                <input
                  type="text"
                  value={newWorkspace.members}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, members: e.target.value })}
                  placeholder="user1, user2, user3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Separate multiple usernames with commas
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus size={16} />
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacesPanel;
