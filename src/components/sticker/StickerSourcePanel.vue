<script setup lang="ts">
import type { UploadFile } from "element-plus";
import type { StickerVideoMetadata } from "@/core/stickerVideo";
import type { VideoPreset, VideoSamplingMode, VideoSamplingPlan } from "@/composables/useStickerMaker";

const props = defineProps<{
  mode: "static" | "animated";
  actionPrompt: string;
  loading: boolean;
  videoExtracting: boolean;
  videoFrameCount: number;
  videoTargetFps: number;
  videoSamplingMode: VideoSamplingMode;
  videoSamplingPlan: VideoSamplingPlan;
  videoStartTime: number;
  videoEndTime: number;
  defaultDelay: number;
  toolMaxFrames?: number;
  lastVideoMeta?: StickerVideoMetadata | null;
}>();
const emit = defineEmits<{
  upload: [files: File[]];
  generate: [];
  updateActionPrompt: [value: string];
  updateVideoFrameCount: [value: number];
  updateVideoTargetFps: [value: number];
  updateVideoSamplingMode: [value: VideoSamplingMode];
  updateVideoStartTime: [value: number];
  updateVideoEndTime: [value: number];
  updateDefaultDelay: [value: number];
  applyVideoPreset: [value: VideoPreset];
}>();

function onChange(file: UploadFile) {
  if (file.raw) emit("upload", [file.raw as File]);
}
</script>

<template>
  <div class="source-panel">
    <div class="upload-card">
      <div class="section-heading">
        <p class="sub-title">上传自己的素材</p>
        <el-tag type="success" effect="plain">主流程</el-tag>
      </div>
      <el-upload
        :auto-upload="false"
        list-type="picture-card"
        :show-file-list="false"
        :on-change="onChange"
        :accept="props.mode === 'animated' ? 'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.mov,.m4v' : 'image/png,image/jpeg,image/webp'"
        :multiple="props.mode === 'animated'"
        :disabled="props.videoExtracting"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
      <p class="muted">
        {{ props.mode === "animated"
          ? "上传视频后会自动截取约 2.5 秒关键片段、按 12fps 抽帧并合成 GIF；也可上传多张图片作为帧。"
          : "上传一张 PNG/JPEG/WebP 后，工具会按当前规格裁剪、补边、压缩并校验；重新上传会替换当前素材。" }}
      </p>

      <div v-if="props.mode === 'animated'" class="video-settings">
        <p class="settings-title">视频转 GIF 自动处理</p>
        <el-alert
          class="wechat-frame-tip"
          type="info"
          :closable="false"
          show-icon
          title="普通动态 GIF 主要看 240×240、GIF 格式和 500KB 体积；帧数会影响流畅度和压缩难度，导出时会自动降色并在必要时抽样。"
        />
        <div class="sampling-summary">
          <span>截取时长：{{ props.videoSamplingPlan.selectedDuration ? `${props.videoSamplingPlan.selectedDuration.toFixed(2)}s` : '默认约 2.5s' }}</span>
          <span>预计抽取：{{ props.videoSamplingPlan.compliantFrameCount }} 帧</span>
          <span>有效 FPS：{{ props.videoSamplingPlan.effectiveFps ? props.videoSamplingPlan.effectiveFps.toFixed(1) : '约 12' }}</span>
        </div>
        <p class="muted sampling-tip">{{ props.videoSamplingPlan.tip }}</p>
        <p v-if="props.lastVideoMeta" class="muted">
          最近视频：{{ props.lastVideoMeta.width }}×{{ props.lastVideoMeta.height }} · {{ props.lastVideoMeta.duration.toFixed(2) }}s
        </p>

        <el-collapse class="advanced-collapse">
          <el-collapse-item title="高级设置：换片段或调流畅度/体积" name="video-advanced">
            <div class="preset-row">
              <span>效果预设</span>
              <el-button size="small" plain @click="emit('applyVideoPreset', 'smooth')">更流畅</el-button>
              <el-button size="small" plain @click="emit('applyVideoPreset', 'normal')">自动推荐</el-button>
              <el-button size="small" plain @click="emit('applyVideoPreset', 'compact')">更小体积</el-button>
            </div>
            <el-radio-group
              class="sampling-mode"
              :model-value="props.videoSamplingMode"
              size="small"
              @update:model-value="emit('updateVideoSamplingMode', $event as VideoSamplingMode)"
            >
              <el-radio-button value="fps">按 FPS 抽取</el-radio-button>
              <el-radio-button value="frame-count">按帧数抽取</el-radio-button>
            </el-radio-group>
            <div class="settings-grid">
              <label v-if="props.videoSamplingMode === 'frame-count'">
                <span>目标帧数</span>
                <el-input-number
                  :model-value="props.videoFrameCount"
                  :min="2"
                  :max="props.toolMaxFrames ?? props.videoSamplingPlan.toolMaxFrames"
                  size="small"
                  @change="emit('updateVideoFrameCount', Number($event))"
                />
              </label>
              <label v-else>
                <span>目标 FPS</span>
                <el-input-number
                  :model-value="props.videoTargetFps"
                  :min="1"
                  :max="30"
                  :step="1"
                  size="small"
                  @change="emit('updateVideoTargetFps', Number($event))"
                />
              </label>
              <label>
                <span>起始秒</span>
                <el-input-number
                  :model-value="props.videoStartTime"
                  :min="0"
                  :step="0.1"
                  size="small"
                  @change="emit('updateVideoStartTime', Number($event))"
                />
              </label>
              <label>
                <span>结束秒</span>
                <el-input-number
                  :model-value="props.videoEndTime"
                  :min="0"
                  :step="0.1"
                  size="small"
                  @change="emit('updateVideoEndTime', Number($event))"
                />
              </label>
              <label>
                <span>帧延迟 ms</span>
                <el-input-number
                  :model-value="props.defaultDelay"
                  :min="20"
                  :max="2000"
                  size="small"
                  @change="emit('updateDefaultDelay', Number($event))"
                />
              </label>
            </div>
            <p class="muted">
              结束秒填 0 会自动使用起始秒后的约 2.5 秒；更短片段通常更流畅也更容易压到 500KB。
            </p>
          </el-collapse-item>
        </el-collapse>

        <el-alert
          v-if="props.videoExtracting"
          class="extracting"
          type="info"
          :closable="false"
          show-icon
          title="正在从视频抽帧，请稍候…"
        />
      </div>
    </div>

    <el-collapse class="ai-collapse">
      <el-collapse-item title="可选：没有素材时用 AI 生成候选素材" name="ai">
        <p class="muted">AI 只生成候选素材；加入后仍会走同一套裁剪、校验和导出流程。</p>
        <el-input
          :model-value="props.actionPrompt"
          type="textarea"
          :rows="3"
          placeholder="描述动作/表情，如：开心挥手、委屈流泪"
          @update:model-value="emit('updateActionPrompt', $event)"
        />
        <div class="prompt-actions">
          <el-button type="primary" :loading="props.loading" @click="emit('generate')">
            <el-icon><Picture /></el-icon> 生成候选素材
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.source-panel {
  display: grid;
  gap: 16px;
}
.upload-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  padding: 16px;
  background: var(--el-fill-color-blank);
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.sub-title {
  margin: 0;
  font-weight: 600;
}
.video-settings {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--el-border-color);
}
.settings-title {
  margin: 0 0 10px;
  font-weight: 600;
}
.wechat-frame-tip {
  margin-bottom: 10px;
}
.advanced-collapse {
  margin-top: 10px;
  border-top: none;
  border-bottom: none;
}
.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.sampling-mode {
  margin-bottom: 10px;
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.settings-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.sampling-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.sampling-summary span {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.sampling-tip {
  color: var(--el-color-primary);
}
.extracting {
  margin-top: 10px;
}
.ai-collapse {
  border-top: none;
  border-bottom: none;
}
.prompt-actions {
  margin-top: 10px;
}
</style>
