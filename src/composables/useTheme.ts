import { watch } from "vue";
import { useConfigStore } from "@/stores/config";
import type { UiTheme } from "@/core/config";

const mql =
  typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function resolvedDark(theme: UiTheme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return mql?.matches ?? false;
}

function applyDark(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * 全局主题：在 App 根组件 setup 中调用一次。
 * - 读取 config.uiTheme 应用到 <html class="dark">
 * - watch 配置变化 + 监听系统偏好变化（auto 模式跟随）
 * - cycle() 在 auto → light → dark 间循环
 */
export function useTheme() {
  const configStore = useConfigStore();

  function apply(): void {
    applyDark(resolvedDark(configStore.config.uiTheme));
  }

  apply();
  watch(() => configStore.config.uiTheme, apply);
  if (mql) mql.addEventListener("change", apply);

  function cycle(): void {
    const order: UiTheme[] = ["auto", "light", "dark"];
    const current = configStore.config.uiTheme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    configStore.update({ uiTheme: next });
  }

  return { apply, cycle };
}
