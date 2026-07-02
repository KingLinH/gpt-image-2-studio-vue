<script setup lang="ts">
import { ref, watch } from "vue";
import { useHistoryStore } from "@/stores/history";
import { getImage } from "@/core/imageStore";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const historyStore = useHistoryStore();
const items = ref<{ id: string; prompt: string; url?: string }[]>([]);

async function load(): Promise<void> {
  const resolved = await Promise.all(
    historyStore.compareIds.map(async (id) => {
      const rec = historyStore.records.find((r) => r.id === id);
      const entry = await getImage(id);
      const url = entry?.full.base64
        ? `data:image/png;base64,${entry.full.base64}`
        : entry?.full.url;
      return { id, prompt: rec?.prompt ?? "", url };
    }),
  );
  items.value = resolved;
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) void load();
  },
);

function remove(id: string): void {
  historyStore.toggleCompare(id);
  void load();
}

function download(id: string): void {
  const rec = historyStore.records.find((r) => r.id === id);
  if (rec) void historyStore.downloadOriginal(rec);
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="并排对比"
    width="94%"
    top="3vh"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-empty v-if="items.length === 0" description="没有选中对比的图片" :image-size="60" />
    <div v-else class="compare-grid">
      <div v-for="it in items" :key="it.id" class="compare-cell">
        <el-image
          v-if="it.url"
          class="compare-img"
          :src="it.url"
          fit="contain"
          :preview-src-list="[it.url]"
          preview-teleported
        />
        <div v-else class="no-img muted">无原图</div>
        <div class="compare-prompt">{{ it.prompt }}</div>
        <div class="compare-actions">
          <el-button link type="primary" size="small" :disabled="!it.url" @click="download(it.id)">下载</el-button>
          <el-button link type="danger" size="small" @click="remove(it.id)">移除</el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.compare-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 10px;
}
.compare-img {
  width: 100%;
  height: 260px;
  background: var(--el-fill-color);
  border-radius: 6px;
}
.no-img {
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.compare-prompt {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  max-height: 60px;
  overflow: hidden;
}
.compare-actions {
  display: flex;
  gap: 8px;
}
.muted {
  color: var(--el-text-color-secondary);
}
</style>
