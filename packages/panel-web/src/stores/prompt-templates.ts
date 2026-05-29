import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * 用户自定义 prompt 模板。localStorage 持久化，跨会话/重启可用。
 *
 * 内置几个常用模板，用户也能添加/编辑/删除。{var} placeholder 不强制，
 * 当前点击插入 composer 后保留 {var} 让用户手动替换 — 后续可以接 modal
 * 输入变量值再插入。
 */
export interface PromptTemplate {
  id: string;        // uuid-ish
  title: string;
  content: string;
  builtin?: boolean; // 内置模板不可删（可隐藏）
}

const STORAGE_KEY = 'panel.prompt.templates';

const BUILTIN: PromptTemplate[] = [
  { id: 'b_summarize', title: '总结上文', content: '请用 5-7 句话总结上面的对话，按重点分点列出', builtin: true },
  { id: 'b_translate', title: '翻译', content: '把下面这段翻译成{lang}：\n\n{text}', builtin: true },
  { id: 'b_code_review', title: '代码 Review', content: '请 review 下面的代码，关注：边界条件、错误处理、命名、性能。代码：\n\n```\n{code}\n```', builtin: true },
  { id: 'b_explain', title: '解释代码', content: '逐行解释这段代码的工作原理：\n\n```\n{code}\n```', builtin: true },
  { id: 'b_continue', title: '继续', content: '继续', builtin: true },
];

function rid(): string {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function load(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t: unknown) => isTemplate(t)) : [];
  } catch {
    return [];
  }
}

function isTemplate(v: unknown): v is PromptTemplate {
  return typeof v === 'object' && v !== null
    && typeof (v as PromptTemplate).id === 'string'
    && typeof (v as PromptTemplate).title === 'string'
    && typeof (v as PromptTemplate).content === 'string';
}

function save(list: PromptTemplate[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

export const usePromptTemplatesStore = defineStore('promptTemplates', () => {
  const userTemplates = ref<PromptTemplate[]>(load());

  const all = computed<PromptTemplate[]>(() => [
    ...BUILTIN,
    ...userTemplates.value,
  ]);

  function add(title: string, content: string): PromptTemplate {
    const tpl: PromptTemplate = { id: rid(), title: title.trim(), content };
    userTemplates.value = [tpl, ...userTemplates.value];
    save(userTemplates.value);
    return tpl;
  }

  function update(id: string, patch: Partial<Omit<PromptTemplate, 'id' | 'builtin'>>): void {
    userTemplates.value = userTemplates.value.map(t => t.id === id ? { ...t, ...patch } : t);
    save(userTemplates.value);
  }

  function remove(id: string): void {
    userTemplates.value = userTemplates.value.filter(t => t.id !== id);
    save(userTemplates.value);
  }

  return { all, userTemplates, add, update, remove };
});
