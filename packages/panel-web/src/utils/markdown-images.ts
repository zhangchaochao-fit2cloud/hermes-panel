export interface MarkdownImagePreview {
  alt: string;
  src: string;
}

const MARKDOWN_IMAGE_RE = /!\[([^\]\r\n]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g;

export function sanitizeMarkdownImageSrc(src: string | null | undefined): string | null {
  const value = (src ?? '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^blob:/i.test(value)) return value;
  if (/^\/(?!\/)/.test(value)) return value;
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) {
    return value.replace(/\s+/g, '');
  }
  return null;
}

export function extractMarkdownImages(text: string, limit = 8): MarkdownImagePreview[] {
  const images: MarkdownImagePreview[] = [];
  if (!text || limit <= 0) return images;

  MARKDOWN_IMAGE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_IMAGE_RE.exec(text)) && images.length < limit) {
    const src = sanitizeMarkdownImageSrc(match[2]);
    if (!src) continue;
    images.push({
      alt: match[1]?.trim() || 'image',
      src,
    });
  }
  return images;
}

export function stripMarkdownImages(text: string): string {
  if (!text) return '';
  MARKDOWN_IMAGE_RE.lastIndex = 0;
  if (!MARKDOWN_IMAGE_RE.test(text)) return text;
  MARKDOWN_IMAGE_RE.lastIndex = 0;
  return text
    .replace(MARKDOWN_IMAGE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
