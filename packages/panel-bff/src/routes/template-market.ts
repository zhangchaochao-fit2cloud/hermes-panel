import Router from '@koa/router';

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

// Bundled catalog — v1 ships with curated templates.
// Later: fetch from a real API like https://hermes-panel.dev/api/templates
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

templateMarketRouter.get('/template-market', async ctx => {
  const category = ctx.query.category as string | undefined;
  const search = (ctx.query.q as string | undefined)?.toLowerCase();
  let results = CATALOG;
  if (category) results = results.filter(t => t.category === category);
  if (search) results = results.filter(t =>
    t.title.toLowerCase().includes(search) ||
    t.tags.some(tag => tag.includes(search)) ||
    t.content.toLowerCase().includes(search)
  );
  ctx.body = results;
});

templateMarketRouter.get('/template-market/categories', async ctx => {
  const cats = [...new Set(CATALOG.map(t => t.category))];
  ctx.body = cats;
});
