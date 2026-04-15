import { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react';

const DEFAULT_ROW_HEIGHT = 56;
const OVERSCAN = 5; // extra rows above/below visible area

/**
 * High-performance virtual scroll table.
 *
 * Props:
 *   rows          — array of data items
 *   rowHeight     — fixed px height per row (default 56)
 *   height        — visible container height in px (default 480)
 *   columns       — [{ key, header, width?, render(row, idx) }]
 *   getRowKey     — (row) => unique key string/number
 *   onRowClick    — (row) => void
 *   selectedIds   — Set of selected IDs (highlights rows)
 *   getId         — (row) => id  (for selectedIds check)
 *   emptySlot     — ReactNode shown when rows.length === 0
 *   headerSlot    — ReactNode above the table (search / bulk actions)
 *   rowClassName  — (row) => extra class string
 */
const VirtualTable = memo(function VirtualTable({
  rows = [],
  rowHeight = DEFAULT_ROW_HEIGHT,
  height = 480,
  columns = [],
  getRowKey,
  onRowClick,
  selectedIds,
  getId,
  emptySlot,
  headerSlot,
  rowClassName,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Which rows are visible?
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(height / rowHeight);
    const rawStart = Math.floor(scrollTop / rowHeight);
    const start = Math.max(0, rawStart - OVERSCAN);
    const end   = Math.min(rows.length - 1, rawStart + visibleCount + OVERSCAN);
    return { startIndex: start, endIndex: end, offsetY: start * rowHeight };
  }, [scrollTop, height, rowHeight, rows.length]);

  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex + 1),
    [rows, startIndex, endIndex]
  );

  const totalHeight = rows.length * rowHeight;

  return (
    <div className="flex flex-col gap-0 w-full">
      {headerSlot && <div className="mb-3">{headerSlot}</div>}

      {/* Table header */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse table-fixed" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-[--card-border]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="table-th text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[--text-secondary]"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtual scroll body */}
      {rows.length === 0 ? (
        emptySlot ?? null
      ) : (
        <div
          ref={containerRef}
          onScroll={onScroll}
          style={{ height, overflowY: 'auto', position: 'relative' }}
          className="w-full overflow-x-auto"
        >
          {/* Total height spacer */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {/* Offset spacer */}
            <table
              className="w-full border-collapse"
              style={{ tableLayout: 'fixed', position: 'absolute', top: offsetY, left: 0, right: 0 }}
            >
              <colgroup>
                {columns.map((col) => (
                  <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                ))}
              </colgroup>
              <tbody>
                {visibleRows.map((row, localIdx) => {
                  const globalIdx = startIndex + localIdx;
                  const key = getRowKey ? getRowKey(row) : globalIdx;
                  const id = getId ? getId(row) : row.id;
                  const isSelected = selectedIds ? selectedIds.has(id) : false;
                  const extraCls = rowClassName ? rowClassName(row) : '';

                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`task-row border-b border-[--card-border] last:border-0 transition-colors duration-100
                        ${isSelected ? 'is-selected' : ''}
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${extraCls}
                      `}
                      style={{ height: rowHeight }}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-0 text-sm text-[--text-primary]">
                          {col.render ? col.render(row, globalIdx) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

export default VirtualTable;
