<script setup lang="ts">
import { computed } from "vue";
import { formatDuration, type HistoryStats } from "@/core/historyStats";

const props = defineProps<{ stats: HistoryStats }>();

const successPct = computed(() => Math.round(props.stats.successRate * 100));
const maxProject = computed(() => Math.max(1, ...props.stats.byProject.map((b) => b.count)));
const maxModel = computed(() => Math.max(1, ...props.stats.byModel.map((b) => b.count)));
</script>

<template>
  <div class="panel stats-panel">
    <el-collapse>
      <el-collapse-item title="📊 数据看板" name="stats">
        <div class="stat-grid">
          <div class="stat"><div class="num">{{ stats.total }}</div><div class="lbl">总记录</div></div>
          <div class="stat"><div class="num ok">{{ stats.success }}</div><div class="lbl">成功</div></div>
          <div class="stat"><div class="num bad">{{ stats.failed }}</div><div class="lbl">失败</div></div>
          <div class="stat"><div class="num">{{ successPct }}%</div><div class="lbl">成功率</div></div>
          <div class="stat"><div class="num">{{ formatDuration(stats.avgDurationMs) }}</div><div class="lbl">平均耗时</div></div>
          <div class="stat"><div class="num">{{ stats.thisMonth }}</div><div class="lbl">本月</div></div>
          <div class="stat"><div class="num star">{{ stats.favoritesCount }}</div><div class="lbl">收藏</div></div>
        </div>

        <div class="bars" v-if="stats.byProject.length">
          <div class="bar-title">按项目</div>
          <div v-for="b in stats.byProject" :key="b.name" class="bar-row">
            <span class="bar-name" :title="b.name">{{ b.name }}</span>
            <div class="bar"><div class="bar-fill" :style="{ width: `${(b.count / maxProject) * 100}%` }"></div></div>
            <span class="bar-count">{{ b.count }}</span>
          </div>
        </div>

        <div class="bars" v-if="stats.byModel.length">
          <div class="bar-title">按模型</div>
          <div v-for="b in stats.byModel" :key="b.name" class="bar-row">
            <span class="bar-name" :title="b.name">{{ b.name }}</span>
            <div class="bar"><div class="bar-fill alt" :style="{ width: `${(b.count / maxModel) * 100}%` }"></div></div>
            <span class="bar-count">{{ b.count }}</span>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.stats-panel {
  padding: 10px 18px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.stat {
  text-align: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 10px 6px;
}
.num {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.num.ok { color: var(--el-color-success); }
.num.bad { color: var(--el-color-danger); }
.num.star { color: var(--el-color-warning); }
.lbl {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.bars {
  margin-top: 8px;
  max-width: 520px;
}
.bar-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.bar-name {
  width: 120px;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.bar {
  flex: 1;
  height: 10px;
  background: var(--el-fill-color);
  border-radius: 5px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--el-color-primary);
}
.bar-fill.alt {
  background: var(--el-color-success);
}
.bar-count {
  font-size: 12px;
  width: 28px;
  text-align: right;
  color: var(--el-text-color-secondary);
}
</style>
