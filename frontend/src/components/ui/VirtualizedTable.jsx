import React, { useMemo, useCallback } from 'react';
import { useMemo as useReactMemo, useCallback as useReactCallback } from 'react';

/**
 * VirtualizedTable Component
 * Efficiently renders large tables with virtualization
 * Note: For full virtualization, consider using react-window or react-virtualized
 * This is a simplified version that handles pagination efficiently
 */

const VirtualizedTable = React.memo(({
  data = [],
  columns = [],
  renderRow,
  renderHeader,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
  onRowClick,
  className = '',
  ...props
}) => {
  // Calculate visible range
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef(null);

  const visibleRange = useReactMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(data.length, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, data.length, overscan]);

  const visibleItems = useReactMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      _virtualIndex: visibleRange.start + index
    }));
  }, [data, visibleRange]);

  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useReactCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Default row renderer
  const defaultRenderRow = useReactCallback((item, index) => {
    return (
      <tr
        key={item.id || index}
        onClick={() => onRowClick?.(item, index)}
        className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        style={{ height: itemHeight }}
      >
        {columns.map((column, colIndex) => (
          <td key={colIndex} className="px-4 py-2 border-b border-gray-200">
            {column.render ? column.render(item[column.key], item, index) : item[column.key]}
          </td>
        ))}
      </tr>
    );
  }, [columns, itemHeight, onRowClick]);

  // Default header renderer
  const defaultRenderHeader = useReactCallback(() => {
    return (
      <tr>
        {columns.map((column, index) => (
          <th key={index} className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-left font-semibold">
            {column.header || column.key}
          </th>
        ))}
      </tr>
    );
  }, [columns]);

  const rowRenderer = renderRow || defaultRenderRow;
  const headerRenderer = renderHeader || defaultRenderHeader;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      {...props}
    >
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-white">
          {headerRenderer()}
        </thead>
        <tbody style={{ height: totalHeight, position: 'relative' }}>
          <tr style={{ height: offsetY }} />
          {visibleItems.map((item, index) => rowRenderer(item, item._virtualIndex, index))}
        </tbody>
      </table>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;


