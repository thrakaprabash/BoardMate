export default function DataTable({ columns = [], rows = [], emptyText = "No data." }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/5 shadow-sm backdrop-blur">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-white/10 text-white/90">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-white/70" colSpan={columns.length}>{emptyText}</td>
            </tr>
          )}
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-white/10">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 align-top">
                  {typeof c.render === "function" ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
