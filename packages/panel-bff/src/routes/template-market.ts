import Router from '@koa/router';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const templateMarketRouter = new Router();

interface MarketTemplate {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
}

interface UserTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

const CATALOG: MarketTemplate[] = [
  {
    id: 'code-review',
    title: 'Code Review Expert',
    content: 'You are a senior code reviewer. Review the following code for:\n1. Logic errors and edge cases\n2. Performance issues\n3. Security vulnerabilities\n4. Code style and readability\n\nProvide specific line-by-line feedback with severity ratings (critical/warning/suggestion).\n\n{code}',
    author: 'hermes-team',
    category: 'development',
    tags: ['code', 'review', 'quality'],
    downloads: 1250,
    rating: 4.8,
  },
  {
    id: 'commit-message',
    title: 'Git Commit Message',
    content: 'Write a conventional commit message for the following changes. Use format:\n\n<type>(<scope>): <description>\n\n<body>\n\nTypes: feat, fix, refactor, docs, test, chore, perf\nKeep subject under 72 chars. Body should explain WHY not WHAT.\n\nChanges:\n{diff}',
    author: 'hermes-team',
    category: 'development',
    tags: ['git', 'commit', 'convention'],
    downloads: 980,
    rating: 4.6,
  },
  {
    id: 'api-design',
    title: 'REST API Design',
    content: 'Design a RESTful API for the following requirement:\n\n{requirement}\n\nInclude:\n- Endpoint paths (use plural nouns)\n- HTTP methods\n- Request/response schemas (TypeScript interfaces)\n- Error responses\n- Pagination strategy\n- Authentication headers',
    author: 'hermes-team',
    category: 'development',
    tags: ['api', 'rest', 'design'],
    downloads: 756,
    rating: 4.5,
  },
  {
    id: 'debug-assistant',
    title: 'Debug Assistant',
    content: 'Help me debug this issue:\n\nError: {error}\nContext: {context}\n\nApproach:\n1. Reproduce the problem (clarify exact steps)\n2. Identify the root cause (not just symptoms)\n3. Explain WHY it happens\n4. Provide a fix with explanation\n5. Suggest how to prevent this class of bug',
    author: 'hermes-team',
    category: 'development',
    tags: ['debug', 'troubleshoot', 'fix'],
    downloads: 890,
    rating: 4.7,
  },
  {
    id: 'tech-writing',
    title: 'Technical Documentation',
    content: 'Write technical documentation for:\n\n{topic}\n\nStructure:\n- Overview (1-2 sentences)\n- Prerequisites\n- Step-by-step guide\n- Code examples\n- Common pitfalls\n- FAQ\n\nTone: clear, concise, developer-friendly. Use active voice.',
    author: 'hermes-team',
    category: 'writing',
    tags: ['docs', 'writing', 'technical'],
    downloads: 650,
    rating: 4.4,
  },
  {
    id: 'sql-optimizer',
    title: 'SQL Query Optimizer',
    content: 'Optimize this SQL query for performance:\n\n```sql\n{query}\n```\n\nContext:\n- Database: {database}\n- Estimated row counts: {counts}\n\nProvide:\n1. Optimized query\n2. EXPLAIN plan analysis\n3. Suggested indexes\n4. Performance estimate (before/after)',
    author: 'community',
    category: 'database',
    tags: ['sql', 'performance', 'optimization'],
    downloads: 420,
    rating: 4.3,
  },
  {
    id: 'meeting-summary',
    title: 'Meeting Summary',
    content: 'Summarize this meeting transcript:\n\n{transcript}\n\nOutput format:\n- Key decisions (bullet points)\n- Action items (owner + deadline)\n- Open questions\n- Next steps\n\nKeep it under 200 words.',
    author: 'community',
    category: 'productivity',
    tags: ['meeting', 'summary', 'productivity'],
    downloads: 530,
    rating: 4.2,
  },
  {
    id: 'test-generator',
    title: 'Unit Test Generator',
    content: 'Write unit tests for the following code:\n\n```{language}\n{code}\n```\n\nRequirements:\n- Use {framework} test framework\n- Cover happy path, edge cases, and error cases\n- Use descriptive test names (describe what, not how)\n- Mock external dependencies\n- Aim for >90% branch coverage',
    author: 'hermes-team',
    category: 'development',
    tags: ['test', 'unit', 'coverage'],
    downloads: 780,
    rating: 4.6,
  },
];

const USER_DATA_DIR = join(process.cwd(), '.hermes-panel', 'templates');

function getUserTemplatesPath(): string {
  return join(USER_DATA_DIR, 'user-templates.json');
}

function ensureDir(): void {
  if (!existsSync(USER_DATA_DIR)) mkdirSync(USER_DATA_DIR, { recursive: true });
}

function loadUserTemplates(): UserTemplate[] {
  try {
    const p = getUserTemplatesPath();
    if (!existsSync(p)) return [];
    const raw = readFileSync(p, 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveUserTemplates(list: UserTemplate[]): void {
  ensureDir();
  writeFileSync(getUserTemplatesPath(), JSON.stringify(list, null, 2), 'utf-8');
}

function rid(): string {
  return 'ut_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

templateMarketRouter.get('/templates', async ctx => {
  const search = (ctx.query.q as string | undefined)?.toLowerCase();
  const category = ctx.query.category as string | undefined;
  let results = CATALOG.map(t => ({ ...t, source: 'builtin' }));
  if (category) results = results.filter(t => t.category === category);
  if (search) results = results.filter(t =>
    t.title.toLowerCase().includes(search) ||
    t.tags.some(tag => tag.includes(search)) ||
    t.content.toLowerCase().includes(search),
  );
  ctx.body = results;
});

templateMarketRouter.get('/templates/community', async ctx => {
  const search = (ctx.query.q as string | undefined)?.toLowerCase();
  const category = ctx.query.category as string | undefined;
  let results = CATALOG.filter(t => t.author === 'community').map(t => ({ ...t, source: 'community' }));
  if (category) results = results.filter(t => t.category === category);
  if (search) results = results.filter(t =>
    t.title.toLowerCase().includes(search) ||
    t.tags.some(tag => tag.includes(search)),
  );
  ctx.body = results;
});

templateMarketRouter.get('/templates/user', async ctx => {
  ctx.body = loadUserTemplates();
});

templateMarketRouter.post('/templates', async ctx => {
  const body = ctx.request.body as { title?: string; content?: string; category?: string; tags?: string[] } | undefined;
  if (!body?.title || !body?.content) {
    ctx.status = 400;
    ctx.body = { error: 'title and content required' };
    return;
  }
  const tpl: UserTemplate = {
    id: rid(),
    title: body.title.trim(),
    content: body.content,
    category: body.category ?? 'custom',
    tags: body.tags ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = loadUserTemplates();
  list.unshift(tpl);
  saveUserTemplates(list);
  ctx.status = 201;
  ctx.body = tpl;
});

templateMarketRouter.put('/templates/:id', async ctx => {
  const body = ctx.request.body as { title?: string; content?: string; category?: string; tags?: string[] } | undefined;
  if (!body) { ctx.status = 400; return; }
  const list = loadUserTemplates();
  const idx = list.findIndex(t => t.id === ctx.params.id);
  if (idx === -1) { ctx.status = 404; return; }
  if (body.title !== undefined) list[idx].title = body.title.trim();
  if (body.content !== undefined) list[idx].content = body.content;
  if (body.category !== undefined) list[idx].category = body.category;
  if (body.tags !== undefined) list[idx].tags = body.tags;
  list[idx].updatedAt = Date.now();
  saveUserTemplates(list);
  ctx.body = list[idx];
});

templateMarketRouter.delete('/templates/:id', async ctx => {
  const list = loadUserTemplates();
  const filtered = list.filter(t => t.id !== ctx.params.id);
  if (filtered.length === list.length) { ctx.status = 404; return; }
  saveUserTemplates(filtered);
  ctx.body = { ok: true };
});

templateMarketRouter.post('/templates/:id/fork', async ctx => {
  const source = CATALOG.find(t => t.id === ctx.params.id);
  if (!source) { ctx.status = 404; ctx.body = { error: 'template not found' }; return; }
  const tpl: UserTemplate = {
    id: rid(),
    title: source.title + ' (Copy)',
    content: source.content,
    category: source.category,
    tags: [...source.tags],
    source: source.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = loadUserTemplates();
  list.unshift(tpl);
  saveUserTemplates(list);
  ctx.status = 201;
  ctx.body = tpl;
});

templateMarketRouter.get('/templates/categories', async ctx => {
  const cats = [...new Set(CATALOG.map(t => t.category))];
  ctx.body = cats;
});
