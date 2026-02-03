// ========================================
// PHASE 4 INTEGRATION SNIPPETS
// Copy these into your Dashboard component
// ========================================

// 1. IMPORTS - Add to top of your Dashboard file
// ========================================
import { useState } from 'react';
import { Download, Share2, Plus, MessageSquare, History, Users } from 'lucide-react';
import ChartEditor from '../components/ChartEditor';
import CustomChartBuilder from '../components/CustomChartBuilder';
import ShareAnalysisModal from '../components/ShareAnalysisModal';
import CommentsPanel from '../components/CommentsPanel';
import VersionHistory from '../components/VersionHistory';
import WorkspacesPanel from '../components/WorkspacesPanel';


// 2. STATE VARIABLES - Add to your Dashboard component
// ========================================
const [showChartEditor, setShowChartEditor] = useState(false);
const [showChartBuilder, setShowChartBuilder] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [selectedChart, setSelectedChart] = useState(null);
const [showCollabPanel, setShowCollabPanel] = useState(false);


// 3. EXPORT FUNCTIONS - Add to your Dashboard component
// ========================================
const exportToPDF = async (taskId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/pdf/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_report_${taskId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to export PDF');
  }
};

const exportToExcel = async (taskId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/excel/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${taskId.substring(0, 8)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Failed to export Excel');
  }
};


// 4. TOOLBAR BUTTONS - Add to your analysis results view
// ========================================
<div className="flex gap-2 mb-4">
  {/* Export Buttons */}
  <button
    onClick={() => exportToPDF(currentTaskId)}
    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
  >
    <Download size={16} />
    Export PDF
  </button>
  
  <button
    onClick={() => exportToExcel(currentTaskId)}
    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
  >
    <Download size={16} />
    Export Excel
  </button>

  {/* Share Button */}
  <button
    onClick={() => setShowShareModal(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
  >
    <Share2 size={16} />
    Share
  </button>

  {/* Custom Chart Button */}
  <button
    onClick={() => setShowChartBuilder(true)}
    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
  >
    <Plus size={16} />
    Create Chart
  </button>

  {/* Collaboration Toggle */}
  <button
    onClick={() => setShowCollabPanel(!showCollabPanel)}
    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
  >
    <MessageSquare size={16} />
    Collaborate
  </button>
</div>


// 5. COLLABORATION PANEL - Add below your main content
// ========================================
{showCollabPanel && currentTaskId && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
    <CommentsPanel taskId={currentTaskId} />
    <VersionHistory taskId={currentTaskId} />
  </div>
)}


// 6. MODALS - Add at the end of your return statement
// ========================================
{/* Chart Editor Modal */}
{showChartEditor && selectedChart && (
  <ChartEditor
    chart={selectedChart}
    onSave={(updatedChart) => {
      // Handle chart save - update your charts state
      console.log('Chart saved:', updatedChart);
      setShowChartEditor(false);
      // Optionally refresh charts
    }}
    onClose={() => setShowChartEditor(false)}
  />
)}

{/* Custom Chart Builder Modal */}
{showChartBuilder && (
  <CustomChartBuilder
    datasets={availableDatasets} // Your dataset filenames array
    onSave={(newChart) => {
      // Handle new chart - add to your charts state
      console.log('Custom chart created:', newChart);
      setShowChartBuilder(false);
      // Optionally refresh charts
    }}
    onClose={() => setShowChartBuilder(false)}
  />
)}

{/* Share Analysis Modal */}
{showShareModal && currentTaskId && (
  <ShareAnalysisModal
    taskId={currentTaskId}
    onClose={() => setShowShareModal(false)}
    onShare={() => {
      // Handle successful share
      console.log('Analysis shared successfully');
      // Optionally show notification
    }}
  />
)}


// 7. CHART GALLERY INTEGRATION - Update your ChartGallery component
// ========================================
// In ChartGallery.jsx, add Edit button to each chart:
<div className="chart-actions">
  <button
    onClick={() => {
      setSelectedChart(chart);
      setShowChartEditor(true);
    }}
    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Edit Chart
  </button>
</div>


// 8. WORKSPACES PAGE - Create a new page or tab
// ========================================
// Option 1: Create new page WorkspacesPage.jsx
import WorkspacesPanel from '../components/WorkspacesPanel';

function WorkspacesPage() {
  return (
    <div className="container mx-auto p-6">
      <WorkspacesPanel />
    </div>
  );
}

export default WorkspacesPage;

// Option 2: Add as tab in Dashboard
<Tab label="Workspaces">
  <WorkspacesPanel />
</Tab>


// 9. FULL DASHBOARD EXAMPLE WITH ALL FEATURES
// ========================================
import { useState, useEffect } from 'react';
import { Download, Share2, Plus, MessageSquare } from 'lucide-react';
import ChartEditor from '../components/ChartEditor';
import CustomChartBuilder from '../components/CustomChartBuilder';
import ShareAnalysisModal from '../components/ShareAnalysisModal';
import CommentsPanel from '../components/CommentsPanel';
import VersionHistory from '../components/VersionHistory';

function Dashboard() {
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  const exportToPDF = async (taskId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/pdf/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${taskId.substring(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (taskId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/excel/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${taskId.substring(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analysis Dashboard</h1>

      {/* Toolbar */}
      {currentTaskId && (
        <div className="flex gap-2 mb-6">
          <button onClick={() => exportToPDF(currentTaskId)} className="btn-export">
            <Download size={16} /> Export PDF
          </button>
          <button onClick={() => exportToExcel(currentTaskId)} className="btn-export">
            <Download size={16} /> Export Excel
          </button>
          <button onClick={() => setShowShareModal(true)} className="btn-share">
            <Share2 size={16} /> Share
          </button>
          <button onClick={() => setShowChartBuilder(true)} className="btn-chart">
            <Plus size={16} /> Create Chart
          </button>
          <button onClick={() => setShowCollabPanel(!showCollabPanel)} className="btn-collab">
            <MessageSquare size={16} /> Collaborate
          </button>
        </div>
      )}

      {/* Main Content - Your existing dashboard content */}
      <div className="main-content">
        {/* Your existing components */}
      </div>

      {/* Collaboration Panel */}
      {showCollabPanel && currentTaskId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <CommentsPanel taskId={currentTaskId} />
          <VersionHistory taskId={currentTaskId} />
        </div>
      )}

      {/* Modals */}
      {showChartEditor && <ChartEditor {...chartEditorProps} />}
      {showChartBuilder && <CustomChartBuilder {...chartBuilderProps} />}
      {showShareModal && <ShareAnalysisModal {...shareModalProps} />}
    </div>
  );
}


// 10. API UTILITY FUNCTIONS - Create api_phase4.js
// ========================================
// Create: frontend/src/api_phase4.js

export const phase4Api = {
  // Export functions
  async exportPDF(taskId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/pdf/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.blob();
  },

  async exportExcel(taskId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://127.0.0.1:8000/export/excel/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.blob();
  },

  // Share functions
  async shareAnalysis(taskId, usernames, permission = 'view') {
    const token = localStorage.getItem('token');
    const response = await fetch('http://127.0.0.1:8000/api/share', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task_id: taskId,
        shared_with: usernames,
        permission
      })
    });
    return response.json();
  },

  // Workspace functions
  async createWorkspace(name, description, members) {
    const token = localStorage.getItem('token');
    const response = await fetch('http://127.0.0.1:8000/api/workspaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, members })
    });
    return response.json();
  },

  async getWorkspaces() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://127.0.0.1:8000/api/workspaces', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
};

// Usage:
// import { phase4Api } from './api_phase4';
// const blob = await phase4Api.exportPDF(taskId);
