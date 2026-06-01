import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const composerPath = join(process.cwd(), 'src/components/chat/Composer.vue');
const messageBubblePath = join(process.cwd(), 'src/components/chat/MessageBubble.vue');
const sessionHoverPreviewPath = join(process.cwd(), 'src/components/sessions/SessionHoverPreview.vue');

describe('chat image experience polish', () => {
  it('lets users attach or paste images into the composer', () => {
    const source = readFileSync(composerPath, 'utf8');

    expect(source).toContain("kind: 'text' | 'image'");
    expect(source).toContain('MAX_IMAGE_BYTES');
    expect(source).toContain('@paste="onPaste"');
    expect(source).toContain('image/png,image/jpeg,image/webp,image/gif,image/*');
    expect(source).toContain('readFileAsDataUrl');
    expect(source).toContain('composer-attachment-thumb');
  });

  it('previews user-attached markdown images instead of showing data urls as text', () => {
    const source = readFileSync(messageBubblePath, 'utf8');

    expect(source).toContain('extractMarkdownImages');
    expect(source).toContain('stripMarkdownImages');
    expect(source).toContain('userImagePreviews');
    expect(source).toContain('user-message-image');
  });

  it('shows image thumbnails in session hover history previews', () => {
    const source = readFileSync(sessionHoverPreviewPath, 'utf8');

    expect(source).toContain('extractMarkdownImages');
    expect(source).toContain('stripMarkdownImages');
    expect(source).toContain('session-preview-images');
    expect(source).toContain('session-preview-image');
  });
});
