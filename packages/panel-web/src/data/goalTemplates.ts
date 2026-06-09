export interface GoalTemplate {
  key: string;
  title: string;
  description: string;
  objective: string;
  scopeBoundary: string;
  doneWhen: string[];
  stopIf: string[];
  tokenBudgetK: number;
  turnBudget: number;
}

export function buildGoalTemplates(t: (key: string) => string): GoalTemplate[] {
  return [
    {
      key: 'releaseReview',
      title: t('goals.templates.releaseReview.title'),
      description: t('goals.templates.releaseReview.description'),
      objective: t('goals.templates.releaseReview.objective'),
      scopeBoundary: t('goals.templates.releaseReview.scope'),
      doneWhen: [
        t('goals.templates.releaseReview.doneWhen.tests'),
        t('goals.templates.releaseReview.doneWhen.risks'),
        t('goals.templates.releaseReview.doneWhen.summary'),
      ],
      stopIf: [t('goals.templates.releaseReview.stopIf.breakingChange')],
      tokenBudgetK: 120,
      turnBudget: 8,
    },
    {
      key: 'bugTriage',
      title: t('goals.templates.bugTriage.title'),
      description: t('goals.templates.bugTriage.description'),
      objective: t('goals.templates.bugTriage.objective'),
      scopeBoundary: t('goals.templates.bugTriage.scope'),
      doneWhen: [
        t('goals.templates.bugTriage.doneWhen.repro'),
        t('goals.templates.bugTriage.doneWhen.fix'),
        t('goals.templates.bugTriage.doneWhen.verify'),
      ],
      stopIf: [t('goals.templates.bugTriage.stopIf.noRepro')],
      tokenBudgetK: 80,
      turnBudget: 6,
    },
    {
      key: 'docsCleanup',
      title: t('goals.templates.docsCleanup.title'),
      description: t('goals.templates.docsCleanup.description'),
      objective: t('goals.templates.docsCleanup.objective'),
      scopeBoundary: t('goals.templates.docsCleanup.scope'),
      doneWhen: [
        t('goals.templates.docsCleanup.doneWhen.current'),
        t('goals.templates.docsCleanup.doneWhen.examples'),
        t('goals.templates.docsCleanup.doneWhen.links'),
      ],
      stopIf: [t('goals.templates.docsCleanup.stopIf.contract')],
      tokenBudgetK: 60,
      turnBudget: 5,
    },
  ];
}
