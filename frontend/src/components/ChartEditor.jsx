import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Download } from 'lucide-react';
import Plot from 'react-plotly.js';

const ChartEditor = ({ chart, onSave, onClose }) => {
  const [editedChart, setEditedChart] = useState(null);
  const [title, setTitle] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [chartType, setChartType] = useState('');
  const [colorScheme, setColorScheme] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (chart) {
      setEditedChart(JSON.parse(JSON.stringify(chart))); // Deep copy
      setTitle(chart.layout?.title?.text || '');
      setXAxisLabel(chart.layout?.xaxis?.title?.text || '');
      setYAxisLabel(chart.layout?.yaxis?.title?.text || '');
      setChartType(chart.data?.[0]?.type || '');
      setShowLegend(chart.layout?.showlegend !== false);
      setShowGrid(chart.layout?.xaxis?.showgrid !== false);
    }
  }, [chart]);

  const updateChart = () => {
    if (!editedChart) return;

    const updated = {
      ...editedChart,
      layout: {
        ...editedChart.layout,
        title: { text: title },
        xaxis: {
          ...editedChart.layout?.xaxis,
          title: { text: xAxisLabel },
          showgrid: showGrid,
        },
        yaxis: {
          ...editedChart.layout?.yaxis,
          title: { text: yAxisLabel },
          showgrid: showGrid,
        },
        showlegend: showLegend,
      },
      data: editedChart.data.map(trace => ({
        ...trace,
        type: chartType || trace.type,
        marker: colorScheme ? { ...trace.marker, color: colorScheme } : trace.marker,
      })),
    };

    setEditedChart(updated);
  };

  useEffect(() => {
    updateChart();
  }, [title, xAxisLabel, yAxisLabel, chartType, colorScheme, showLegend, showGrid]);

  const handleReset = () => {
    if (chart) {
      setEditedChart(JSON.parse(JSON.stringify(chart)));
      setTitle(chart.layout?.title?.text || '');
      setXAxisLabel(chart.layout?.xaxis?.title?.text || '');
      setYAxisLabel(chart.layout?.yaxis?.title?.text || '');
      setChartType(chart.data?.[0]?.type || '');
      setShowLegend(chart.layout?.showlegend !== false);
      setShowGrid(chart.layout?.xaxis?.showgrid !== false);
    }
  };

  const handleSave = () => {
    if (editedChart) {
      onSave(editedChart);
    }
  };

  const handleExport = (format) => {
    if (!editedChart) return;

    const node = document.getElementById('chart-editor-preview');
    if (!node) return;

    if (format === 'png' || format === 'svg') {
      import('html2canvas').then(({ default: html2canvas }) => {
        html2canvas(node).then(canvas => {
          if (format === 'png') {
            canvas.toBlob(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chart-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
            });
          }
        });
      });
    } else if (format === 'pdf') {
      import('jspdf').then(({ default: jsPDF }) => {
        import('html2canvas').then(({ default: html2canvas }) => {
          html2canvas(node).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            pdf.save(`chart-${Date.now()}.pdf`);
          });
        });
      });
    }
  };

  if (!editedChart) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Chart</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Customization Options</h3>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chart Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter chart title"
                />
              </div>

              {/* X-Axis Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  X-Axis Label
                </label>
                <input
                  type="text"
                  value={xAxisLabel}
                  onChange={(e) => setXAxisLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter X-axis label"
                />
              </div>

              {/* Y-Axis Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Y-Axis Label
                </label>
                <input
                  type="text"
                  value={yAxisLabel}
                  onChange={(e) => setYAxisLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter Y-axis label"
                />
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chart Type
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="line">Line Chart</option>
                  <option value="histogram">Histogram</option>
                  <option value="box">Box Plot</option>
                  <option value="heatmap">Heatmap</option>
                </select>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={colorScheme || '#3b82f6'}
                  onChange={(e) => setColorScheme(e.target.value)}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>

              {/* Toggle Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showLegend}
                    onChange={(e) => setShowLegend(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Legend</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Grid</span>
                </label>
              </div>

              {/* Export Options */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Export Chart</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('png')}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    PNG
                  </button>
                  <button
                    onClick={() => handleExport('svg')}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    SVG
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Preview</h3>
              <div id="chart-editor-preview" className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <Plot
                  data={editedChart.data}
                  layout={{
                    ...editedChart.layout,
                    autosize: true,
                    height: 400,
                  }}
                  config={{ responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartEditor;
