import { sanitizeMarkdownImageSrc } from './markdown-images';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MarkdownCodeCopyLabels {
  copy: string;
  copied: string;
  copyFailed: string;
}

export interface MarkdownCopyLabels extends MarkdownCodeCopyLabels {
  copyImage: string;
}

const copyResetTimers = new WeakMap<HTMLButtonElement, number>();

export function hydrateMarkdownCodeBlocks(root: HTMLElement | null, labels: MarkdownCodeCopyLabels): void {
  if (!root) return;
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-md-code-copy]')) {
    setCopyButtonState(button, labels.copy, false);
  }
}

export function hydrateMarkdownControls(root: HTMLElement | null, labels: MarkdownCopyLabels): void {
  hydrateMarkdownCodeBlocks(root, labels);
  if (!root) return;
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-md-image-copy]')) {
    setCopyButtonState(button, labels.copyImage, false);
  }
}

export async function handleMarkdownCodeCopyClick(
  event: MouseEvent,
  labels: MarkdownCodeCopyLabels,
): Promise<boolean> {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const button = target.closest<HTMLButtonElement>('[data-md-code-copy]');
  if (!button) return false;
  event.preventDefault();
  event.stopPropagation();

  const code = button
    .closest('.md-code-block')
    ?.querySelector('pre code')
    ?.textContent ?? '';
  if (!code) return true;

  const ok = await copyText(code);
  setCopyButtonState(button, ok ? labels.copied : labels.copyFailed, ok);

  const prev = copyResetTimers.get(button);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    setCopyButtonState(button, labels.copy, false);
    copyResetTimers.delete(button);
  }, ok ? 1400 : 1800);
  copyResetTimers.set(button, timer);
  return true;
}

export async function handleMarkdownControlClick(
  event: MouseEvent,
  labels: MarkdownCopyLabels,
): Promise<boolean> {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const imageButton = target.closest<HTMLButtonElement>('[data-md-image-copy]');
  if (imageButton) {
    event.preventDefault();
    event.stopPropagation();
    const src = imageButton.dataset.mdImageSrc ?? '';
    const ok = await copyImage(src);
    setCopyButtonState(imageButton, ok ? labels.copied : labels.copyFailed, ok);

    const prev = copyResetTimers.get(imageButton);
    if (prev) window.clearTimeout(prev);
    const timer = window.setTimeout(() => {
      setCopyButtonState(imageButton, labels.copyImage, false);
      copyResetTimers.delete(imageButton);
    }, ok ? 1400 : 1800);
    copyResetTimers.set(imageButton, timer);
    return true;
  }
  return handleMarkdownCodeCopyClick(event, labels);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

async function copyImage(src: string): Promise<boolean> {
  const safeSrc = sanitizeMarkdownImageSrc(src);
  if (!safeSrc) return false;

  try {
    const ClipboardItemCtor = window.ClipboardItem;
    if (navigator.clipboard?.write && ClipboardItemCtor) {
      const blob = await imageSrcToBlob(safeSrc);
      if (blob?.type.startsWith('image/')) {
        await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
        return true;
      }
    }
  } catch {
    /* fall back to copying the image URL / data URL as text */
  }
  return copyText(safeSrc);
}

async function imageSrcToBlob(src: string): Promise<Blob | null> {
  if (src.startsWith('data:')) {
    const response = await fetch(src);
    return response.blob();
  }
  const response = await fetch(src);
  if (!response.ok) return null;
  return response.blob();
}

function setCopyButtonState(button: HTMLButtonElement, label: string, copied: boolean): void {
  const text = button.querySelector<HTMLElement>('[data-md-code-copy-label], [data-md-image-copy-label]');
  if (text) text.textContent = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.classList.toggle('is-copied', copied);
}
