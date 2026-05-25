/**
 * Lightweight, local-only "quality / hallucination" heuristic for v0.1.
 *
 * We deliberately do NOT make a second LLM call to score every answer
 * because that would:
 *   1. Double the token spend
 *   2. Add 2-3s latency per turn
 *   3. Risk the scoring model itself hallucinating
 *
 * Instead we estimate quality from observable signals in the response:
 *   - presence of structure (headings, bullets, code)
 *   - presence of source citations / URLs / file paths
 *   - presence of hedging language ("I'm not sure", "maybe", "I think")
 *   - presence of contradiction markers
 *   - length appropriate to question complexity
 *
 * The result is a rough indicator — better than nothing, but should
 * NOT be presented as authoritative. UI labels it clearly as
 * "本地估算".
 */

export interface QualityScore {
  /** 0-100, higher = better */
  quality: number;
  /** 0-1, higher = more likely to contain hallucination */
  hallucinationRisk: number;
  /** Bullet-pointed reasoning so the UI can show "why this score" */
  notes: string[];
}

const HEDGE_PATTERNS = [
  /i('?m| am)? not (?:sure|certain)/i,
  /\bmaybe\b/i,
  /\bperhaps\b/i,
  /\bi think\b/i,
  /我不(?:太)?确定/,
  /\b可能\b/,
  /\b大概\b/,
];

const CONTRADICTION_PATTERNS = [
  /however,.*but/is,
  /actually,?\s*(?:no|wait)/i,
  /correction:/i,
  /\b其实(?:不是|不对)/,
];

const CITATION_PATTERNS = [
  /https?:\/\//,
  /\[[\d ,]+\]/,            // [1], [1, 2]
  /\(\d{4}\)/,              // (2023)
  /\bsource:/i,
  /参考[：:]/,
];

export function scoreResponse(text: string, question?: string): QualityScore {
  if (!text || text.length < 5) {
    return { quality: 0, hallucinationRisk: 0.5, notes: ['response too short to score'] };
  }

  const notes: string[] = [];
  let quality = 70;
  let risk = 0.05;

  // Structure
  const hasCode = /```/.test(text);
  const hasBullets = /^[\s]*[*\-•]\s/m.test(text);
  const hasHeadings = /^#+\s/m.test(text);
  if (hasCode || hasBullets || hasHeadings) {
    quality += 8;
    notes.push('结构化输出（代码/列表/标题）');
  }

  // Citations
  if (CITATION_PATTERNS.some(p => p.test(text))) {
    quality += 10;
    notes.push('包含引用或链接');
  }

  // Hedging — moderate signal
  const hedgeCount = HEDGE_PATTERNS.reduce((n, p) => n + (p.test(text) ? 1 : 0), 0);
  if (hedgeCount > 0) {
    risk += 0.15 * hedgeCount;
    quality -= 5 * hedgeCount;
    notes.push(`检测到 ${hedgeCount} 处不确定语气`);
  }

  // Contradictions
  if (CONTRADICTION_PATTERNS.some(p => p.test(text))) {
    risk += 0.3;
    quality -= 12;
    notes.push('包含自我修正或矛盾');
  }

  // Length sanity (very short answers to long questions are suspect)
  if (question && question.length > 80 && text.length < 100) {
    risk += 0.2;
    quality -= 15;
    notes.push('回答相对于问题过于简短');
  }

  // Excessive repetition (degenerate output)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const uniqueLines = new Set(lines);
  if (lines.length > 5 && uniqueLines.size < lines.length * 0.6) {
    risk += 0.25;
    quality -= 20;
    notes.push('检测到内容重复');
  }

  // Clamp
  quality = Math.max(0, Math.min(100, quality));
  risk = Math.max(0, Math.min(1, risk));

  return { quality: Math.round(quality), hallucinationRisk: Number(risk.toFixed(2)), notes };
}
