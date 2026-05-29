import { defineStore } from 'pinia';
import { ref } from 'vue';
import { HEADERS } from '@hermes-panel/shared';
import { getBffBaseAsync, getPanelTokenAsync } from '@/api/token';

/**
 * Backup / restore client store.
 *
 * Both endpoints bypass `bffFetch` because:
 *  - downloadBackup() needs the raw binary response so we can hand it to
 *    the browser as a Blob and trigger a save dialog.
 *  - uploadRestore() sends a binary File body with Content-Type:
 *    application/zip (bffFetch hard-codes application/json).
 *
 * Both still attach the panel token header so auth still passes.
 */
export const useBackupStore = defineStore('backup', () => {
  const downloading = ref(false);
  const uploading = ref(false);
  const downloadError = ref<string | null>(null);
  const uploadError = ref<string | null>(null);
  const lastSavedFilename = ref<string | null>(null);

  function parseFilenameFromDisposition(value: string | null): string {
    if (!value) return `hermes-backup-${Date.now()}.zip`;
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(value);
    return match?.[1] ?? `hermes-backup-${Date.now()}.zip`;
  }

  async function readError(res: Response): Promise<string> {
    try {
      const body = await res.json() as { error?: { code?: string; message?: string } };
      return body.error?.message ?? body.error?.code ?? `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  }

  async function downloadBackup(): Promise<{ ok: boolean; error?: string }> {
    downloading.value = true;
    downloadError.value = null;
    try {
      const res = await fetch(`${await getBffBaseAsync()}/api/backup`, {
        method: 'GET',
        headers: { [HEADERS.PANEL_TOKEN]: await getPanelTokenAsync() },
      });
      if (!res.ok) {
        const msg = await readError(res);
        downloadError.value = msg;
        return { ok: false, error: msg };
      }
      const blob = await res.blob();
      const filename = parseFilenameFromDisposition(res.headers.get('Content-Disposition'));
      lastSavedFilename.value = filename;
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        // Defer revoke so the browser can finish the download.
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      }
      return { ok: true };
    } catch (err) {
      const msg = (err as Error).message ?? 'download failed';
      downloadError.value = msg;
      return { ok: false, error: msg };
    } finally {
      downloading.value = false;
    }
  }

  async function uploadRestore(file: File, force: boolean): Promise<{ ok: boolean; error?: string }> {
    uploading.value = true;
    uploadError.value = null;
    try {
      const url = `${await getBffBaseAsync()}/api/restore?force=${force ? 'true' : 'false'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          [HEADERS.PANEL_TOKEN]: await getPanelTokenAsync(),
          'Content-Type': 'application/zip',
        },
        body: file,
      });
      if (!res.ok) {
        const msg = await readError(res);
        uploadError.value = msg;
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (err) {
      const msg = (err as Error).message ?? 'upload failed';
      uploadError.value = msg;
      return { ok: false, error: msg };
    } finally {
      uploading.value = false;
    }
  }

  return {
    downloading,
    uploading,
    downloadError,
    uploadError,
    lastSavedFilename,
    downloadBackup,
    uploadRestore,
  };
});
