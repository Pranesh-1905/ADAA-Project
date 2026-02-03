import { useState, useEffect } from 'react';
import { Plus, X, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import Plot from 'react-plotly.js';

const CustomChartBuilder = ({ datasets, onSave, onClose, selectedDataset: initialDataset }) => {
  const [selectedDataset, setSelectedDataset] = useState(initialDataset || '');
  const [columns, setColumns] = useState([]);
  const [chartConfig, setChartConfig] = useState({
    chartType: 'bar',
    xColumn: '',
    yColumn: '',
    title: 'Custom Chart',
    xLabel: 'X Axis',
    yLabel: 'Y Axis',
    color: '#3b82f6',
  });
  const [previewData, setPreviewData] = useState(null);
  const [dataValues, setDataValues] = useState({ x: [], y: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedDataset) {
      // Fetch column names from the selected dataset
      fetchDatasetColumns(selectedDataset);
    }
  }, [selectedDataset]);

  const fetchDatasetColumns = async (filename) => {
    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/dataset-columns/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to load columns' }));
        throw new Error(errorData.detail);
      }
      
      const data = await response.json();
      setColumns(data.columns || []);
    } catch (error) {
      console.error('Error fetching columns:', error);
      setError(error.message);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chartConfig.xColumn && chartConfig.yColumn && selectedDataset) {
      generatePreview();
    }
  }, [chartConfig, selectedDataset]);

  const generatePreview = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const payload = {
        filename: selectedDataset,
        x_column: chartConfig.xColumn,
        chart_type: chartConfig.chartType,
      };
      
      // Only include y_column if chart type requires it
      if (chartConfig.chartType !== 'histogram' && chartConfig.yColumn) {
        payload.y_column = chartConfig.yColumn;
      }
      
      const response = await fetch('http://127.0.0.1:8000/generate-custom-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to generate chart' }));
        throw new Error(errorData.detail);
      }
      
      const data = await response.json();
      setDataValues(data.values);
      updatePreviewChart(data.values);
    } catch (error) {
      console.error('Error generating preview:', error);
      setError(error.message);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewChart = (values) => {
    let trace;

    switch (chartConfig.chartType) {
      case 'bar':
        trace = {
          type: 'bar',
          x: values.x,
          y: values.y,
          marker: { color: chartConfig.color },
        };
        break;
      case 'line':
        trace = {
          type: 'scatter',
          mode: 'lines',
          x: values.x,
          y: values.y,
          line: { color: chartConfig.color },
        };
        break;
      case 'scatter':
        trace = {
          type: 'scatter',
          mode: 'markers',
          x: values.x,
          y: values.y,
          marker: { color: chartConfig.color },
        };
        break;
      case 'histogram':
        trace = {
          type: 'histogram',
          x: values.x,
          marker: { color: chartConfig.color },
        };
        break;
      default:
        trace = {
          type: 'bar',
          x: values.x,
          y: values.y,
          marker: { color: chartConfig.color },
        };
    }

    const layout = {
      title: { text: chartConfig.title },
      xaxis: { title: { text: chartConfig.xLabel } },
      yaxis: { title: { text: chartConfig.yLabel } },
      height: 400,
      autosize: true,
    };

    setPreviewData({ data: [trace], layout });
  };

  const handleSave = () => {
    if (previewData) {
      onSave({
        ...previewData,
        metadata: {
          dataset: selectedDataset,
          config: chartConfig,
          createdAt: new Date().toISOString(),
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg-overlay)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col card-lg"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2xl)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <TrendingUp style={{ color: 'var(--primary)' }} size={24} />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Custom Chart Builder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors btn-ghost"
          >
            <X size={24} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Chart Configuration</h3>

              {/* Dataset Selection */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Select Dataset
                </label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  disabled={datasets && datasets.length === 1}
                  className="w-full px-3 py-2 border rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                >
                  <option value="">-- Choose Dataset --</option>
                  {datasets?.map((ds, idx) => (
                    <option key={idx} value={ds}>{ds}</option>
                  ))}
                </select>
                {datasets && datasets.length === 1 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Creating chart for current analysis
                  </p>
                )}
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Chart Type
                </label>
                <select
                  value={chartConfig.chartType}
                  onChange={(e) => setChartConfig({ ...chartConfig, chartType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="histogram">Histogram</option>
                </select>
              </div>

              {/* X Column */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  X-Axis Column
                </label>
                <select
                  value={chartConfig.xColumn}
                  onChange={(e) => setChartConfig({ ...chartConfig, xColumn: e.target.value })}
                  disabled={!selectedDataset}
                  className="w-full px-3 py-2 border rounded-md disabled:opacity-50"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                >
                  <option value="">-- Select Column --</option>
                  {columns.map((col, idx) => (
                    <option key={idx} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Y Column */}
              {chartConfig.chartType !== 'histogram' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Y-Axis Column
                  </label>
                  <select
                    value={chartConfig.yColumn}
                    onChange={(e) => setChartConfig({ ...chartConfig, yColumn: e.target.value })}
                    disabled={!selectedDataset}
                    className="w-full px-3 py-2 border rounded-md disabled:opacity-50"
                    style={{ 
                      borderColor: 'var(--border)', 
                      background: 'var(--surface)', 
                      color: 'var(--text)'
                    }}
                  >
                    <option value="">-- Select Column --</option>
                    {columns.map((col, idx) => (
                      <option key={idx} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Chart Title
                </label>
                <input
                  type="text"
                  value={chartConfig.title}
                  onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                  placeholder="Enter chart title"
                />
              </div>

              {/* X Label */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  X-Axis Label
                </label>
                <input
                  type="text"
                  value={chartConfig.xLabel}
                  onChange={(e) => setChartConfig({ ...chartConfig, xLabel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                  placeholder="Enter X-axis label"
                />
              </div>

              {/* Y Label */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Y-Axis Label
                </label>
                <input
                  type="text"
                  value={chartConfig.yLabel}
                  onChange={(e) => setChartConfig({ ...chartConfig, yLabel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: 'var(--surface)', 
                    color: 'var(--text)'
                  }}
                  placeholder="Enter Y-axis label"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Color
                </label>
                <input
                  type="color"
                  value={chartConfig.color}
                  onChange={(e) => setChartConfig({ ...chartConfig, color: e.target.value })}
                  className="w-full h-10 border rounded-md"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Live Preview</h3>
              <div className="p-4 rounded-lg border" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)' }}>
                {error && (
                  <div className="mb-4 p-3 rounded-md" style={{ background: 'var(--error-bg)', border: '1px solid var(--error)', color: 'var(--error)' }}>
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                {loading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
                      <p style={{ color: 'var(--text-secondary)' }}>Generating preview...</p>
                    </div>
                  </div>
                ) : previewData ? (
                  <Plot
                    data={previewData.data}
                    layout={previewData.layout}
                    config={{ responsive: true }}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
                    Configure your chart to see a preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 p-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!previewData}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Create Chart
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomChartBuilder;
