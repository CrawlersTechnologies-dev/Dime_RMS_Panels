import { useState } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * columns: [{ key, header, render?(row), align?: 'right', className? }]
 * Rows are clickable when onRowClick is set (also via Enter key).
 * Client-side pagination; swap for server paging when the API supports it.
 */
export default function DataTable({ columns, rows, rowKey = 'id', onRowClick, empty = 'Nothing to show yet.', pageSize = 10 }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={clsx('font-medium py-2.5 whitespace-nowrap', i === 0 ? 'pl-5 pr-3' : i === columns.length - 1 ? 'pl-3 pr-5' : 'px-3', c.align === 'right' && 'text-right')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-ink-500">{empty}</td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row[rowKey]}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={clsx(onRowClick && 'cursor-pointer hover:bg-canvas/70 focus-visible:bg-canvas/70')}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={clsx('py-3 align-middle', i === 0 ? 'pl-5 pr-3' : i === columns.length - 1 ? 'pl-3 pr-5' : 'px-3', c.align === 'right' && 'text-right tabular', c.className)}
                    >
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line text-[13px] text-ink-500">
          <span className="tabular">
            {current * pageSize + 1}–{Math.min(rows.length, (current + 1) * pageSize)} of {rows.length}
          </span>
          <div className="flex gap-1">
            <button className="p-1.5 rounded-full hover:bg-ink-900/5 disabled:opacity-40" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-ink-900/5 disabled:opacity-40" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Row of filters above a table, inside a flush Panel. */
export function FilterBar({ children }) {
  return <div className="flex flex-wrap items-center gap-2.5 px-5 pb-4 [&>*]:min-w-0">{children}</div>
}
