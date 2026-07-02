import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { groupHistoryRecordsForDisplay, generateId, type ImageRecord } from "@/core/history";
import { readJson, writeJson, downloadImage, makeThumbnail, triggerBlobDownload } from "@/core/storage";
import { saveImage, getImage, getThumb, deleteImage, clearImages } from "@/core/imageStore";
import { slugifyPrompt } from "@/core/fileNames";
import { computeStats, type HistoryStats } from "@/core/historyStats";
import type { ParsedImage } from "@/core/api";

const STORAGE_KEY = "gpt-image-2:history";
const MAX_RECORDS = 300;

// 旧版记录可能带 thumbnail 字段（迁移用）。
type LegacyRecord = ImageRecord & { thumbnail?: string };

export const useHistoryStore = defineStore("history", () => {
  const records = ref<ImageRecord[]>([]);
  const displayItems = ref(groupHistoryRecordsForDisplay([]));
  const projectFilter = ref("");
  const favoriteOnly = ref(false);
  const compareIds = ref<string[]>([]);
  const compareVisible = ref(false);
  // id -> 缩略图 data URL（从 IndexedDB 异步载入）
  const thumbnailById = reactive<Record<string, string>>({});

  // 所有出现过的项目名（用于历史页筛选下拉）。
  const projects = computed(() => {
    const set = new Set<string>();
    for (const r of records.value) if (r.project) set.add(r.project);
    return Array.from(set);
  });

  const stats = computed<HistoryStats>(() => computeStats(records.value));

  function filteredRecords(): ImageRecord[] {
    const f = (projectFilter.value ?? "").trim();
    return records.value.filter((r) => {
      if (f && (r.project ?? "") !== f) return false;
      if (favoriteOnly.value && !r.favorite) return false;
      return true;
    });
  }

  function refreshDisplay(): void {
    displayItems.value = groupHistoryRecordsForDisplay(filteredRecords());
  }

  // el-select 清除时会传 undefined，这里统一兜底为空串。
  function setProjectFilter(name: string | undefined | null): void {
    projectFilter.value = typeof name === "string" ? name : "";
    refreshDisplay();
  }

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
    } catch {
      // 配额超限：保留较新的一半并重试一次，给用户可见提示。
      const trimmed = records.value.slice(0, Math.floor(MAX_RECORDS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        ElMessage.warning("本地历史已接近存储上限，已自动清理较旧记录。");
      } catch {
        ElMessage.warning("本地存储已满，历史未能保存。");
      }
    }
  }

  function load(): void {
    const stored = readJson<LegacyRecord[]>(STORAGE_KEY, []);
    // 一次性迁移：旧记录的 thumbnail 搬进 IndexedDB，元数据里剔除该字段。
    records.value = stored
      .slice(0, MAX_RECORDS)
      .map((r) => {
        if (r.thumbnail) {
          void saveImage(r.id, {
            full: { base64: stripDataPrefix(r.thumbnail) },
            thumb: r.thumbnail,
          });
        }
        const { thumbnail: _omit, ...rest } = r;
        return rest as ImageRecord;
      });
    refreshDisplay();
  }

  load();

  async function add(record: ImageRecord, image?: ParsedImage): Promise<void> {
    records.value = [record, ...records.value].slice(0, MAX_RECORDS);
    persist();
    refreshDisplay();
    if (image) {
      const thumb = (await makeThumbnail(image)) ?? "";
      await saveImage(record.id, { full: image, thumb });
      if (thumb) thumbnailById[record.id] = thumb;
    }
  }

  async function addMany(
    newRecords: ImageRecord[],
    images?: Record<string, ParsedImage>,
  ): Promise<void> {
    records.value = [...newRecords, ...records.value].slice(0, MAX_RECORDS);
    persist();
    refreshDisplay();
    if (images) {
      for (const rec of newRecords) {
        const image = images[rec.id];
        if (image) {
          const thumb = (await makeThumbnail(image)) ?? "";
          await saveImage(rec.id, { full: image, thumb });
          if (thumb) thumbnailById[rec.id] = thumb;
        }
      }
    }
  }

  async function remove(id: string): Promise<void> {
    records.value = records.value.filter((r) => r.id !== id);
    persist();
    refreshDisplay();
    delete thumbnailById[id];
    await deleteImage(id);
  }

  async function clear(): Promise<void> {
    records.value = [];
    writeJson(STORAGE_KEY, []);
    refreshDisplay();
    for (const key of Object.keys(thumbnailById)) delete thumbnailById[key];
    await clearImages();
  }

  // 按当前记录批量载入缩略图（供历史页预览）。
  async function hydrateThumbnails(): Promise<void> {
    const ids = records.value.map((r) => r.id).filter((id) => !(id in thumbnailById));
    await Promise.all(
      ids.map(async (id) => {
        const thumb = await getThumb(id);
        if (thumb) thumbnailById[id] = thumb;
      }),
    );
  }

  // 从 IndexedDB 取原图并触发下载（历史页「下载」按钮）。
  async function downloadOriginal(record: ImageRecord): Promise<void> {
    const entry = await getImage(record.id);
    if (!entry?.full) {
      ElMessage.warning("该记录没有可下载的原图。");
      return;
    }
    const ext = record.format || "png";
    const name = `${slugifyPrompt(record.prompt)}-${record.id.slice(-6)}.${ext}`;
    try {
      await downloadImage(entry.full, name, ext);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : "下载失败。");
    }
  }

  // ---- 收藏 ----
  function toggleFavorite(id: string): void {
    records.value = records.value.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r));
    persist();
    refreshDisplay();
  }

  function setFavoriteOnly(value: boolean): void {
    favoriteOnly.value = value;
    refreshDisplay();
  }

  // ---- 并排对比 ----
  const MAX_COMPARE = 6;
  function toggleCompare(id: string): void {
    if (compareIds.value.includes(id)) {
      compareIds.value = compareIds.value.filter((x) => x !== id);
    } else if (compareIds.value.length < MAX_COMPARE) {
      compareIds.value = [...compareIds.value, id];
    } else {
      ElMessage.warning(`对比最多 ${MAX_COMPARE} 张。`);
    }
  }
  function clearCompare(): void {
    compareIds.value = [];
  }

  // ---- 导出 / 导入（备份恢复；仅元数据，不含原图）----
  function exportJSON(onlyFavorites: boolean): void {
    const data = onlyFavorites ? records.value.filter((r) => r.favorite) : records.value;
    const payload = JSON.stringify(data, null, 2);
    triggerBlobDownload(new Blob([payload], { type: "application/json" }), `gpt-image-2-${onlyFavorites ? "favorites" : "history"}-${Date.now()}.json`);
  }

  function importJSON(text: string): number {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      ElMessage.error("JSON 解析失败，文件格式不对。");
      return 0;
    }
    const arr = (Array.isArray(parsed) ? parsed : []) as ImageRecord[];
    const existing = new Set(records.value.map((r) => r.id));
    const fresh = arr.filter((r) => r && r.id && !existing.has(r.id));
    if (fresh.length === 0) {
      ElMessage.info("没有新记录可导入（均已存在）。");
      return 0;
    }
    records.value = [...fresh, ...records.value].slice(0, MAX_RECORDS);
    persist();
    refreshDisplay();
    void hydrateThumbnails();
    ElMessage.success(`已导入 ${fresh.length} 条记录（注：导入记录无原图）。`);
    return fresh.length;
  }

  return {
    records,
    displayItems,
    thumbnailById,
    projects,
    stats,
    projectFilter,
    favoriteOnly,
    compareIds,
    compareVisible,
    setProjectFilter,
    setFavoriteOnly,
    toggleFavorite,
    toggleCompare,
    clearCompare,
    exportJSON,
    importJSON,
    add,
    addMany,
    remove,
    clear,
    hydrateThumbnails,
    downloadOriginal,
    refreshDisplay,
  };
});

function stripDataPrefix(dataUrl: string): string | undefined {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : undefined;
}

export { generateId };
