import clsx from "clsx";
import type { SeatPreviewCell } from "@/lib/seat-map";

export interface PublicSeat {
  id: string;
  rowLabel: string;
  seatNumber: string;
  seatCode: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
  ticketTypeId?: string;
}

interface SeatMapViewProps {
  /** Row-based preview from layout builder */
  previewRows?: SeatPreviewCell[][];
  /** Live show seats from API */
  seats?: PublicSeat[];
  selectedSeatIds?: string[];
  onToggleSeat?: (seatId: string) => void;
  /** Builder: click to toggle gap (aisle) on preview cells with seatCode */
  onToggleGap?: (rowIndex: number, seatNumber: number) => void;
  readOnly?: boolean;
}

export function SeatMapView({
  previewRows,
  seats,
  selectedSeatIds = [],
  onToggleSeat,
  onToggleGap,
  readOnly = false,
}: SeatMapViewProps) {
  if (previewRows && previewRows.length > 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 overflow-x-auto">
        <div className="mb-4 min-w-[280px] rounded bg-surface-muted py-2 text-center text-xs uppercase tracking-wider text-text-muted">
          Screen / Stage
        </div>
        <div className="space-y-3 min-w-[280px]">
          {previewRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <div className="w-7 shrink-0 text-xs font-medium text-text-muted">
                {row[0]?.rowLabel ?? ""}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.map((cell, cellIndex) => {
                  if (cell.status === "GAP") {
                    return (
                      <div
                        key={`gap-${rowIndex}-${cellIndex}`}
                        className="h-8 w-6 rounded-md border border-dashed border-border/60"
                        aria-hidden
                      />
                    );
                  }
                  const isSelected = cell.id ? selectedSeatIds.includes(cell.id) : false;
                  return (
                    <button
                      key={`${cell.seatCode}-${cellIndex}`}
                      type="button"
                      disabled={readOnly && !onToggleGap}
                      title={cell.seatCode}
                      onClick={() => {
                        if (onToggleGap && cell.seatNumber) {
                          onToggleGap(rowIndex, parseInt(cell.seatNumber, 10));
                        }
                      }}
                      className={clsx(
                        "h-8 min-w-[2rem] rounded-md border px-1.5 text-xs font-medium transition",
                        onToggleGap && "ring-1 ring-transparent hover:ring-brand-500/50",
                        isSelected
                          ? "border-brand-400 bg-brand-600/30 text-brand-100"
                          : "border-border text-white"
                      )}
                      style={
                        !isSelected && cell.color
                          ? { backgroundColor: `${cell.color}33`, borderColor: `${cell.color}88` }
                          : undefined
                      }
                    >
                      {cell.seatNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!seats?.length) {
    return <p className="text-sm text-text-muted">No seat map configured for this show.</p>;
  }

  const byRow = new Map<string, PublicSeat[]>();
  for (const seat of [...seats].sort(
    (a, b) =>
      a.rowLabel.localeCompare(b.rowLabel) ||
      a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
  )) {
    const list = byRow.get(seat.rowLabel) ?? [];
    list.push(seat);
    byRow.set(seat.rowLabel, list);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 overflow-x-auto">
      <div className="mb-4 min-w-[280px] rounded bg-surface-muted py-2 text-center text-xs uppercase tracking-wider text-text-muted">
        Screen / Stage
      </div>
      <div className="space-y-3 min-w-[280px]">
        {Array.from(byRow.entries()).map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="flex items-center gap-2">
            <div className="w-7 shrink-0 text-xs font-medium text-text-muted">{rowLabel}</div>
            <div className="flex flex-wrap gap-1.5">
              {rowSeats.map((seat) => {
                const isSelected = selectedSeatIds.includes(seat.id);
                const isAvailable = seat.status === "AVAILABLE";
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={readOnly || !isAvailable}
                    title={seat.seatCode}
                    onClick={() => onToggleSeat?.(seat.id)}
                    className={clsx(
                      "h-8 min-w-[2rem] rounded-md border px-1.5 text-xs transition",
                      isSelected
                        ? "border-brand-400 bg-brand-600/30 text-brand-200"
                        : isAvailable
                          ? "border-emerald-600/40 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25"
                          : "cursor-not-allowed border-border bg-surface-muted text-text-muted"
                    )}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
