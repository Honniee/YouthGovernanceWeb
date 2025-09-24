import React from 'react';
import ExportButton from './ExportButton';
import { useStaffExport, useBulkExport } from './useExport';

/**
 * ExportButton Component Examples
 * Demonstrates various configurations and use cases
 */
const ExportButtonExamples = () => {
  // Mock staff service for examples
  const mockStaffService = {
    exportStaff: async (format, status) => {
      console.log(`Mock export: ${format}, status: ${status}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, message: 'Export completed successfully' };
    }
  };

  // Example hooks
  const mainExport = useStaffExport({
    staffService: mockStaffService,
    statusFilter: 'all',
    onSuccess: (result, format) => alert(`Main export successful: ${format}`),
    onError: (error, format) => alert(`Main export failed: ${format}`)
  });

  const bulkExport = useBulkExport({
    staffService: mockStaffService,
    selectedItems: [1, 2, 3],
    onSuccess: (result, format) => alert(`Bulk export successful: ${format} (3 items)`),
    onError: (error, format) => alert(`Bulk export failed: ${format}`)
  });

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ExportButton Component Examples</h1>
        <p className="text-gray-600 mb-8">Reusable export button component with dropdown options for different formats.</p>

        {/* Basic Usage */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Usage</h2>
          <div className="flex flex-wrap items-center gap-4">
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={(format) => alert(`Exporting as ${format}`)}
            />
            <ExportButton
              formats={['csv', 'pdf', 'json']}
              onExport={(format) => alert(`Exporting as ${format}`)}
              variant="secondary"
              label="Download"
            />
            <ExportButton
              formats={['csv', 'xlsx']}
              onExport={(format) => alert(`Exporting as ${format}`)}
              variant="outline"
              size="sm"
            />
          </div>
        </section>

        {/* Different Variants */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Variants</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Primary (default):</h3>
              <ExportButton
                formats={['csv', 'pdf']}
                onExport={(format) => alert(`Primary: ${format}`)}
                variant="primary"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Secondary:</h3>
              <ExportButton
                formats={['csv', 'pdf']}
                onExport={(format) => alert(`Secondary: ${format}`)}
                variant="secondary"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Outline:</h3>
              <ExportButton
                formats={['csv', 'pdf']}
                onExport={(format) => alert(`Outline: ${format}`)}
                variant="outline"
              />
            </div>
          </div>
        </section>

        {/* Different Sizes */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Sizes</h2>
          <div className="flex items-center space-x-4">
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={(format) => alert(`Small: ${format}`)}
              size="sm"
              label="Small"
            />
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={(format) => alert(`Medium: ${format}`)}
              size="md"
              label="Medium"
            />
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={(format) => alert(`Large: ${format}`)}
              size="lg"
              label="Large"
            />
          </div>
        </section>

        {/* With Loading State */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">With Loading State</h2>
          <div className="flex items-center space-x-4">
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={mainExport.handleExport}
              isExporting={mainExport.isExporting}
              label="Export Staff"
              loadingLabel="Exporting..."
            />
            <ExportButton
              formats={['csv', 'pdf']}
              onExport={bulkExport.handleExport}
              isExporting={bulkExport.isExporting}
              label="Bulk Export"
              loadingLabel="Processing..."
              variant="secondary"
            />
          </div>
          {mainExport.isExporting && (
            <p className="text-sm text-blue-600 mt-2">Main export in progress...</p>
          )}
          {bulkExport.isExporting && (
            <p className="text-sm text-blue-600 mt-2">Bulk export in progress...</p>
          )}
        </section>

        {/* Custom Formats */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Formats</h2>
          <ExportButton
            formats={['csv', 'pdf', 'custom']}
            onExport={(format) => alert(`Custom format: ${format}`)}
            customFormats={{
              custom: {
                label: 'Export as Custom',
                icon: <span>🔧</span>,
                description: 'Custom export format'
              }
            }}
            label="Custom Export"
          />
        </section>

        {/* Different Positioning */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Positioning</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Auto positioning (default):</h3>
              <ExportButton
                formats={['csv', 'pdf']}
                onExport={(format) => alert(`Auto: ${format}`)}
                position="auto"
                label="Auto Position"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Fixed positioning:</h3>
              <ExportButton
                formats={['csv', 'pdf']}
                onExport={(format) => alert(`Fixed: ${format}`)}
                position="fixed"
                label="Fixed Position"
              />
            </div>
          </div>
        </section>

        {/* StaffManagement Integration Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">StaffManagement Integration</h2>
          
          <div className="space-y-6">
            {/* Main Export Button */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Main Export (Toolbar)</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input type="text" placeholder="Search staff..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">Sort</button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExportButton
                      formats={['csv', 'pdf']}
                      onExport={mainExport.handleExport}
                      isExporting={mainExport.isExporting}
                      label="Export"
                      size="md"
                    />
                    <div className="flex border border-gray-200 rounded-lg p-1">
                      <button className="p-1.5 bg-white text-blue-600 shadow-sm rounded">⊞</button>
                      <button className="p-1.5 text-gray-600">☰</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Export Button */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Export (Selected Items)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">3</span>
                    </div>
                    <span className="text-sm font-medium text-blue-700">3 staff members selected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">Bulk Actions</button>
                    <ExportButton
                      formats={['csv', 'pdf']}
                      onExport={bulkExport.handleExport}
                      isExporting={bulkExport.isExporting}
                      label="Export"
                      size="md"
                      position="fixed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Examples</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Basic Usage:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<ExportButton
  formats={['csv', 'pdf']}
  onExport={(format) => handleExport(format)}
  isExporting={isExporting}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">With Custom Hook (StaffManagement):</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`import { ExportButton, useStaffExport } from './components/portal_main_content';

// In component:
const exportHook = useStaffExport({
  staffService,
  statusFilter,
  onSuccess: () => alert('Export successful!'),
  onError: (error) => alert('Export failed!')
});

// In render:
<ExportButton
  formats={['csv', 'pdf']}
  onExport={exportHook.handleExport}
  isExporting={exportHook.isExporting}
  position="fixed"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Replace Current StaffManagement Export:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`// OLD (80+ lines of dropdown logic):
const [showExportDropdown, setShowExportDropdown] = useState(false);
const exportDropdownRef = useRef(null);
// ... complex click outside logic
// ... complex dropdown rendering

// NEW (1 line):
<ExportButton
  formats={['csv', 'pdf']}
  onExport={handleExport}
  isExporting={isExporting}
/>`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExportButtonExamples;





























