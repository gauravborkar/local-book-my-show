import { useMemo, useState } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SeatMapView } from "./SeatMapView";
import {
  CATEGORY_COLORS,
  countLayoutSeats,
  createId,
  defaultLayout,
  layoutToPreviewCells,
  layoutToSeatTemplate,
  seatTemplateToLayout,
  type SeatMapLayoutConfig,
  type SeatTemplateItem,
} from "@/lib/seat-map";

interface SeatMapBuilderProps {
  value: SeatMapLayoutConfig;
  onChange: (layout: SeatMapLayoutConfig) => void;
}

export function SeatMapBuilder({ value, onChange }: SeatMapBuilderProps) {
  const [showJson, setShowJson] = useState(false);
  const [jsonError, setJsonError] = useState("");

  const previewRows = useMemo(() => layoutToPreviewCells(value), [value]);
  const seatCount = useMemo(() => countLayoutSeats(value), [value]);

  function updateLayout(patch: Partial<SeatMapLayoutConfig>) {
    onChange({ ...value, ...patch });
  }

  function addCategory() {
    const id = createId();
    const n = value.categories.length + 1;
    updateLayout({
      categories: [
        ...value.categories,
        {
          id,
          key: `Tier ${n}`,
          label: `Tier ${n}`,
          priceRupees: 499,
          color: CATEGORY_COLORS[(n - 1) % CATEGORY_COLORS.length],
          maxPerOrder: 10,
        },
      ],
    });
  }

  function updateCategory(id: string, patch: Partial<SeatMapLayoutConfig["categories"][0]>) {
    updateLayout({
      categories: value.categories.map((c) => (c.id === id ? { ...c, ...patch, key: patch.label ?? patch.key ?? c.key } : c)),
    });
  }

  function removeCategory(id: string) {
    const fallback = value.categories.find((c) => c.id !== id)?.id;
    if (!fallback) return;
    updateLayout({
      categories: value.categories.filter((c) => c.id !== id),
      rows: value.rows.map((r) => (r.categoryId === id ? { ...r, categoryId: fallback } : r)),
    });
  }

  function addRow() {
    const nextLetter = String.fromCharCode(65 + value.rows.length);
    updateLayout({
      rows: [
        ...value.rows,
        {
          id: createId(),
          rowLabel: value.rows.length > 0 ? nextLetter : "A",
          seatCount: 10,
          categoryId: value.categories[0]?.id ?? "",
          skipSeats: [],
        },
      ],
    });
  }

  function updateRow(id: string, patch: Partial<SeatMapLayoutConfig["rows"][0]>) {
    updateLayout({
      rows: value.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function removeRow(id: string) {
    updateLayout({ rows: value.rows.filter((r) => r.id !== id) });
  }

  function toggleGap(rowIndex: number, seatNumber: number) {
    const row = value.rows[rowIndex];
    if (!row) return;
    const skip = new Set(row.skipSeats);
    if (skip.has(seatNumber)) skip.delete(seatNumber);
    else skip.add(seatNumber);
    updateRow(row.id, { skipSeats: [...skip].sort((a, b) => a - b) });
  }

  function exportJson() {
    const template = layoutToSeatTemplate(value);
    const blob = new Blob([JSON.stringify({ layout: value, seats: template }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seat-map.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.layout?.version === 1) {
          onChange(parsed.layout as SeatMapLayoutConfig);
          setJsonError("");
          return;
        }
        if (Array.isArray(parsed)) {
          onChange(seatTemplateToLayout(parsed as SeatTemplateItem[]));
          setJsonError("");
          return;
        }
        if (Array.isArray(parsed.seats)) {
          onChange(seatTemplateToLayout(parsed.seats as SeatTemplateItem[]));
          if (parsed.layout) onChange(parsed.layout);
          setJsonError("");
          return;
        }
        setJsonError("Unrecognized JSON format");
      } catch {
        setJsonError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Seat map builder</h3>
          <p className="text-sm text-text-muted">
            Design your venue layout once — every show at this facility reuses it.
          </p>
        </div>
        <p className="text-sm font-medium text-brand-300">{seatCount} seats</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Ticket categories</h4>
              <Button type="button" variant="ghost" size="sm" onClick={addCategory}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {value.categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-border p-3 grid gap-2 sm:grid-cols-2"
              >
                <Input
                  label="Name"
                  value={cat.label}
                  onChange={(e) =>
                    updateCategory(cat.id, { label: e.target.value, key: e.target.value })
                  }
                />
                <Input
                  label="Price (₹)"
                  type="number"
                  min={0}
                  value={cat.priceRupees}
                  onChange={(e) =>
                    updateCategory(cat.id, { priceRupees: parseInt(e.target.value, 10) || 0 })
                  }
                />
                <div className="flex items-end gap-2 sm:col-span-2">
                  <label className="text-xs text-text-muted">Color</label>
                  <input
                    type="color"
                    value={cat.color}
                    onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    label="Max per order"
                    type="number"
                    className="flex-1"
                    value={cat.maxPerOrder}
                    onChange={(e) =>
                      updateCategory(cat.id, { maxPerOrder: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                  {value.categories.length > 1 && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-400 hover:bg-surface-muted"
                      onClick={() => removeCategory(cat.id)}
                      aria-label="Remove category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Rows</h4>
              <Button type="button" variant="ghost" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4" /> Add row
              </Button>
            </div>
            {value.rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-border p-3 grid gap-2 sm:grid-cols-4"
              >
                <Input
                  label="Row"
                  value={row.rowLabel}
                  onChange={(e) => updateRow(row.id, { rowLabel: e.target.value.toUpperCase() })}
                />
                <Input
                  label="Seats"
                  type="number"
                  min={1}
                  max={50}
                  value={row.seatCount}
                  onChange={(e) =>
                    updateRow(row.id, { seatCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
                <label className="block space-y-1.5 sm:col-span-1">
                  <span className="text-sm text-text-muted">Category</span>
                  <select
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm"
                    value={row.categoryId}
                    onChange={(e) => updateRow(row.id, { categoryId: e.target.value })}
                  >
                    {value.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-red-400 hover:bg-surface-muted"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => onChange(defaultLayout())}>
              Reset template
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={exportJson}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-muted">
              <Upload className="h-4 w-4" />
              Import
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJsonFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowJson(!showJson)}>
              {showJson ? "Hide" : "Show"} JSON
            </Button>
          </div>
          {jsonError && <p className="text-sm text-red-400">{jsonError}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Click a seat in the preview to mark an aisle/gap (seat won&apos;t be sold).
          </p>
          <SeatMapView previewRows={previewRows} onToggleGap={toggleGap} />
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            {value.categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.label} — ₹{c.priceRupees}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showJson && (
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-border bg-surface-elevated p-3 font-mono text-xs"
          readOnly
          value={JSON.stringify({ layout: value, seats: layoutToSeatTemplate(value) }, null, 2)}
        />
      )}
    </div>
  );
}

export { layoutToSeatTemplate, defaultLayout, type SeatMapLayoutConfig };
