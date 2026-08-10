import type { WjTable } from '@/lib/workshop/content';

export function DataTable({ table, dense = false }: { table: WjTable; dense?: boolean }) {
  return (
    <figure className="my-4">
      {table.caption && (
        <figcaption className="mb-2 font-serif text-sm font-semibold text-wj-ink">
          {table.caption}
        </figcaption>
      )}
      <div className="wj-scrollbar overflow-x-auto rounded border border-wj-border bg-wj-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-wj-border bg-wj-raised">
              {table.head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={`whitespace-nowrap px-3 font-medium text-wj-muted ${dense ? 'py-1.5' : 'py-2'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-wj-line last:border-0">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 align-top ${dense ? 'py-1.5' : 'py-2'} ${
                      ci === 0 ? 'font-medium text-wj-ink' : 'text-wj-muted'
                    } ${/^[\d.%～–—-]+$/.test(cell) ? 'font-mono tabular-nums text-wj-water' : ''}`}
                  >
                    {cell || (
                      // 空格子是留给学习者填的（判断题的「正 / 误」列），
                      // 画一条待填横线，不要画成「无数据」的破折号
                      <span
                        aria-label="待填"
                        className="inline-block h-4 w-14 border-b border-dashed border-wj-border align-middle"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && <p className="mt-2 text-xs leading-6 text-wj-muted">{table.note}</p>}
    </figure>
  );
}
