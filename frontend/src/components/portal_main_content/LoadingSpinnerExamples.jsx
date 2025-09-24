import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * LoadingSpinner Examples
 * 
 * Comprehensive examples showing all the different ways to use the LoadingSpinner component.
 * This demonstrates the flexibility and customization options available.
 */
const LoadingSpinnerExamples = () => {
  const [currentExample, setCurrentExample] = useState('basic');

  const examples = {
    basic: {
      title: 'Basic Usage',
      description: 'Simple loading spinner with default settings'
    },
    sizes: {
      title: 'Different Sizes',
      description: 'Spinners in various sizes from xs to xl'
    },
    variants: {
      title: 'Loading Variants',
      description: 'Different types of loading animations'
    },
    colors: {
      title: 'Color Themes',
      description: 'Various color themes for different contexts'
    },
    inline: {
      title: 'Inline Loading',
      description: 'Non-centered loading for inline usage'
    },
    custom: {
      title: 'Custom Messages',
      description: 'Custom loading messages for different contexts'
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">LoadingSpinner Component</h1>
        <p className="text-gray-600 mb-8">A flexible and reusable loading component for various use cases.</p>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(examples).map(([key, example]) => (
            <button
              key={key}
              onClick={() => setCurrentExample(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentExample === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {example.title}
            </button>
          ))}
        </div>

        {/* Current Example */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{examples[currentExample].title}</h2>
            <p className="text-gray-600 mt-1">{examples[currentExample].description}</p>
          </div>

          <div className="p-6">
            {currentExample === 'basic' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Default Loading Spinner</h3>
                  <LoadingSpinner />
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-4">On Dark Background</h3>
                  <LoadingSpinner color="gray" />
                </div>
              </div>
            )}

            {currentExample === 'sizes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Extra Small (xs)</h3>
                  <LoadingSpinner size="xs" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Small (sm)</h3>
                  <LoadingSpinner size="sm" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Medium (md) - Default</h3>
                  <LoadingSpinner size="md" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Large (lg)</h3>
                  <LoadingSpinner size="lg" height="h-24" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Extra Large (xl)</h3>
                  <LoadingSpinner size="xl" height="h-32" />
                </div>
              </div>
            )}

            {currentExample === 'variants' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Spinner (Default)</h3>
                  <LoadingSpinner variant="spinner" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Bouncing Dots</h3>
                  <LoadingSpinner variant="dots" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Pulsing Circle</h3>
                  <LoadingSpinner variant="pulse" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Animated Bars</h3>
                  <LoadingSpinner variant="bars" />
                </div>
              </div>
            )}

            {currentExample === 'colors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Blue (Default)</h3>
                  <LoadingSpinner color="blue" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Green</h3>
                  <LoadingSpinner color="green" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Purple</h3>
                  <LoadingSpinner color="purple" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Gray</h3>
                  <LoadingSpinner color="gray" height="h-20" />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Red</h3>
                  <LoadingSpinner color="red" height="h-20" />
                </div>
              </div>
            )}

            {currentExample === 'inline' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Inline Loading (Button)</h3>
                  <div className="flex items-center space-x-4">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2">
                      <LoadingSpinner 
                        size="xs" 
                        center={false} 
                        showMessage={false} 
                        color="gray" 
                      />
                      <span>Loading...</span>
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg">
                      Completed
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Inline with Text</h3>
                  <div className="flex items-center space-x-3">
                    <LoadingSpinner 
                      size="sm" 
                      center={false} 
                      showMessage={false} 
                      variant="dots"
                    />
                    <span className="text-gray-700">Processing your request...</span>
                  </div>
                </div>
              </div>
            )}

            {currentExample === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Loading Staff Data</h3>
                  <LoadingSpinner 
                    message="Loading staff data..." 
                    color="blue"
                  />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Processing Upload</h3>
                  <LoadingSpinner 
                    message="Processing file upload..." 
                    variant="dots" 
                    color="green"
                  />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Generating Report</h3>
                  <LoadingSpinner 
                    message="Generating your report..." 
                    variant="bars" 
                    color="purple"
                  />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Saving Changes</h3>
                  <LoadingSpinner 
                    message="Saving your changes..." 
                    variant="pulse" 
                    color="green"
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Usage Examples</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Basic Usage</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<LoadingSpinner />`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Custom Configuration</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<LoadingSpinner 
  size="lg"
  variant="dots"
  color="green"
  message="Loading staff data..."
  height="h-32"
/>`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Inline Usage</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<LoadingSpinner 
  size="xs"
  center={false}
  showMessage={false}
  variant="spinner"
/>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinnerExamples;




























