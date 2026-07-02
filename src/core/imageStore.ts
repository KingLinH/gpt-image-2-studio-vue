// IndexedDB 图片持久化：原图 + 缩略图。
// localStorage 只存历史元数据，避免 5MB 配额问题；图片体积大，放 IDB。
import { createStore, get, set, del, clear } from "idb-keyval";
import type { ParsedImage } from "./api";

const store = createStore("gpt-image-2-db", "images");

export type StoredImage = {
  full: ParsedImage; // 原图（base64 或 url）
  thumb: string; // 缩略图 data URL（用于历史预览）
};

export async function saveImage(id: string, value: StoredImage): Promise<void> {
  try {
    await set(id, value, store);
  } catch (error) {
    console.warn("写入 IndexedDB 失败：", error);
  }
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  try {
    return await get<StoredImage>(id, store);
  } catch {
    return undefined;
  }
}

export async function getThumb(id: string): Promise<string | undefined> {
  return (await getImage(id))?.thumb;
}

export async function deleteImage(id: string): Promise<void> {
  try {
    await del(id, store);
  } catch {
    /* ignore */
  }
}

export async function clearImages(): Promise<void> {
  try {
    await clear(store);
  } catch {
    /* ignore */
  }
}
