// 历史数据统计（纯函数）。
import type { ImageRecord } from "./history";

export type StatBucket = { name: string; count: number };

export type HistoryStats = {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  successRate: number; // 0~1
  avgDurationMs: number; // 成功的平均耗时
  thisMonth: number;
  favoritesCount: number;
  byProject: StatBucket[];
  byModel: StatBucket[];
};

export function computeStats(records: ImageRecord[]): HistoryStats {
  const total = records.length;
  let success = 0;
  let failed = 0;
  let cancelled = 0;
  let favoritesCount = 0;
  let durationSum = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let thisMonth = 0;
  const projectMap = new Map<string, number>();
  const modelMap = new Map<string, number>();

  for (const r of records) {
    if (r.status === "success") {
      success += 1;
      durationSum += r.durationMs || 0;
    } else if (r.status === "failed") failed += 1;
    else if (r.status === "cancelled") cancelled += 1;
    if (r.favorite) favoritesCount += 1;
    if (new Date(r.createdAt).getTime() >= monthStart) thisMonth += 1;
    if (r.project) projectMap.set(r.project, (projectMap.get(r.project) ?? 0) + 1);
    if (r.model) modelMap.set(r.model, (modelMap.get(r.model) ?? 0) + 1);
  }

  return {
    total,
    success,
    failed,
    cancelled,
    successRate: total > 0 ? success / total : 0,
    avgDurationMs: success > 0 ? Math.round(durationSum / success) : 0,
    thisMonth,
    favoritesCount,
    byProject: toBuckets(projectMap),
    byModel: toBuckets(modelMap),
  };
}

function toBuckets(map: Map<string, number>): StatBucket[] {
  return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function formatDuration(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${m}m${rest}s`;
}
