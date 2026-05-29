/** Seat map layout (stored on facility) + flat template (used for shows/booking). */

export interface SeatTemplateItem {
  ticketTypeKey: string;
  rowLabel: string;
  seatNumber: string;
  x?: number;
  y?: number;
  priceCents?: number;
  maxPerOrder?: number;
}

export interface SeatCategory {
  id: string;
  key: string;
  label: string;
  priceRupees: number;
  color: string;
  maxPerOrder: number;
}

export interface SeatRowConfig {
  id: string;
  rowLabel: string;
  seatCount: number;
  categoryId: string;
  /** Seat numbers (1..seatCount) left empty for aisle/wheelchair gap */
  skipSeats: number[];
}

export interface SeatMapLayoutConfig {
  version: 1;
  categories: SeatCategory[];
  rows: SeatRowConfig[];
}

export const CATEGORY_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

export function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultLayout(): SeatMapLayoutConfig {
  const generalId = createId();
  const vipId = createId();
  return {
    version: 1,
    categories: [
      {
        id: generalId,
        key: "General",
        label: "General",
        priceRupees: 499,
        color: CATEGORY_COLORS[0],
        maxPerOrder: 10,
      },
      {
        id: vipId,
        key: "VIP",
        label: "VIP",
        priceRupees: 999,
        color: CATEGORY_COLORS[2],
        maxPerOrder: 6,
      },
    ],
    rows: [
      { id: createId(), rowLabel: "A", seatCount: 8, categoryId: vipId, skipSeats: [] },
      { id: createId(), rowLabel: "B", seatCount: 10, categoryId: generalId, skipSeats: [5] },
      { id: createId(), rowLabel: "C", seatCount: 10, categoryId: generalId, skipSeats: [5] },
    ],
  };
}

export function layoutToSeatTemplate(layout: SeatMapLayoutConfig): SeatTemplateItem[] {
  const catById = new Map(layout.categories.map((c) => [c.id, c]));
  const seats: SeatTemplateItem[] = [];

  layout.rows.forEach((row, rowIndex) => {
    const cat = catById.get(row.categoryId);
    if (!cat) return;
    const rowLabel = row.rowLabel.trim().toUpperCase();
    const skip = new Set(row.skipSeats);

    for (let n = 1; n <= row.seatCount; n++) {
      if (skip.has(n)) continue;
      seats.push({
        ticketTypeKey: cat.key,
        rowLabel,
        seatNumber: String(n),
        x: n - 1,
        y: rowIndex,
        priceCents: Math.round(cat.priceRupees * 100),
        maxPerOrder: cat.maxPerOrder,
      });
    }
  });

  return seats;
}

export function seatTemplateToLayout(seats: SeatTemplateItem[]): SeatMapLayoutConfig {
  const categoryKeys = [...new Set(seats.map((s) => s.ticketTypeKey))];
  const categories: SeatCategory[] = categoryKeys.map((key, i) => {
    const sample = seats.find((s) => s.ticketTypeKey === key);
    return {
      id: createId(),
      key,
      label: key,
      priceRupees: sample?.priceCents ? sample.priceCents / 100 : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      maxPerOrder: sample?.maxPerOrder ?? 10,
    };
  });
  const catIdByKey = new Map(categories.map((c) => [c.key, c.id]));

  const rowLabels = [...new Set(seats.map((s) => s.rowLabel.toUpperCase()))].sort();
  const rows: SeatRowConfig[] = rowLabels.map((rowLabel) => {
    const rowSeats = seats.filter((s) => s.rowLabel.toUpperCase() === rowLabel);
    const key = rowSeats[0]?.ticketTypeKey ?? categoryKeys[0];
    const nums = rowSeats.map((s) => parseInt(s.seatNumber, 10)).filter((n) => !Number.isNaN(n));
    const maxNum = Math.max(...nums, 0);
    const present = new Set(nums);
    const skipSeats: number[] = [];
    for (let n = 1; n <= maxNum; n++) {
      if (!present.has(n)) skipSeats.push(n);
    }
    return {
      id: createId(),
      rowLabel,
      seatCount: maxNum,
      categoryId: catIdByKey.get(key) ?? categories[0].id,
      skipSeats,
    };
  });

  return { version: 1, categories, rows };
}

export function countLayoutSeats(layout: SeatMapLayoutConfig): number {
  return layoutToSeatTemplate(layout).length;
}

/** Preview cell for builder or public map */
export interface SeatPreviewCell {
  id?: string;
  rowLabel: string;
  seatNumber: string;
  seatCode: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "GAP";
  categoryKey?: string;
  color?: string;
}

export function layoutToPreviewCells(layout: SeatMapLayoutConfig): SeatPreviewCell[][] {
  const catById = new Map(layout.categories.map((c) => [c.id, c]));
  return layout.rows.map((row) => {
    const cat = catById.get(row.categoryId);
    const rowLabel = row.rowLabel.trim().toUpperCase();
    const skip = new Set(row.skipSeats);
    const cells: SeatPreviewCell[] = [];
    for (let n = 1; n <= row.seatCount; n++) {
      if (skip.has(n)) {
        cells.push({
          rowLabel,
          seatNumber: "",
          seatCode: "",
          status: "GAP",
        });
        continue;
      }
      cells.push({
        rowLabel,
        seatNumber: String(n),
        seatCode: `${rowLabel}-${n}`,
        status: "AVAILABLE",
        categoryKey: cat?.key,
        color: cat?.color,
      });
    }
    return cells;
  });
}
