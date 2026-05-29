/**
 * Trigger a browser download for a Blob.
 *
 * Why the setTimeout: Safari/WebKit revokes the object URL too early if
 * we revoke synchronously after the click — the download never starts.
 * 1s is enough for every browser to begin the transfer.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
