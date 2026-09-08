export type Overlay = {
  id: string;
  text: string;
  nx: number;
  ny: number;
};

export type Shot = {
  id: string;
  uri: string;
  width: number;
  height: number;
  overlays: Overlay[];
};

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function picUri(uri?: string, base64?: string) {
  if (base64) return `data:image/jpeg;base64,${base64}`;
  return uri;
}

/** Shortest-column pack so a 3-col grid can keep each image's aspect ratio. */
export function packColumns<T extends { width: number; height: number }>(items: T[], cols: number): T[][] {
  const buckets: T[][] = Array.from({ length: cols }, () => []);
  const heights = Array.from({ length: cols }, () => 0);
  for (const item of items) {
    let i = 0;
    for (let c = 1; c < cols; c++) {
      if ((heights[c] ?? 0) < (heights[i] ?? 0)) i = c;
    }
    buckets[i]?.push(item);
    const ratio = item.width > 0 ? item.height / item.width : 1;
    heights[i] = (heights[i] ?? 0) + ratio;
  }
  return buckets;
}
