export const workflowRegistry = {
  'openclaw.release.tweet': {
    name: 'openclaw.release.tweet',
    description:
      'Generate an OpenClaw release tweet (sassy/professional/drybread) from commits + changelog, with approval.',
    argsSchema: {
      type: 'object',
      properties: {
        repo_dir: { type: 'string', description: 'Path to OpenClaw repo (default: ../openclaw)' },
        since_ref: { type: 'string', description: 'Start ref (tag/sha). Default: HEAD~max_commits' },
        max_commits: { type: 'number', description: 'Commit window when since_ref is empty (default: 30)' },
        link: { type: 'string', description: 'Release notes link to include (default: https://openclaw.dev)' },
        style: { type: 'string', description: 'sassy|professional|drybread (default: professional)' },
      },
      required: [],
    },
    examples: [
      {
        args: { style: 'sassy', since_ref: 'HEAD~30', link: 'https://openclaw.dev' },
        description: 'Generate a sassy tweet from last 30 commits.',
      },
    ],
    sideEffects: [],
  },
  'openclaw.release.post': {
    name: 'openclaw.release.post',
    description:
      'Generate an OpenClaw release tweet and (after approval) post to X via bird CLI.',
    argsSchema: {
      type: 'object',
      properties: {
        repo_dir: { type: 'string', description: 'Path to OpenClaw repo (default: ../openclaw)' },
        since_ref: { type: 'string', description: 'Start ref (tag/sha). Default: HEAD~max_commits' },
        max_commits: { type: 'number', description: 'Commit window when since_ref is empty (default: 30)' },
        link: { type: 'string', description: 'Release notes link to include (default: https://openclaw.dev)' },
        style: { type: 'string', description: 'sassy|professional|drybread (default: professional)' },
      },
      required: [],
    },
    examples: [
      {
        args: { style: 'professional', since_ref: 'HEAD~30', link: 'https://openclaw.dev' },
        description: 'Approve and post a professional tweet.',
      },
    ],
    sideEffects: ['local_exec'],
  },
  'github.pr.monitor': {
    name: 'github.pr.monitor',
    description: 'Fetch PR state via gh, diff against last run, emit only on change.',
    argsSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/repo (e.g. clawdbot/clawdbot)' },
        pr: { type: 'number', description: 'Pull request number' },
        key: { type: 'string', description: 'Optional state key override.' },
        changesOnly: { type: 'boolean', description: 'If true, suppress output when unchanged.' },
        summaryOnly: { type: 'boolean', description: 'If true, return only a compact change summary (smaller output).' },
      },
      required: ['repo', 'pr'],
    },
    examples: [
      {
        args: { repo: 'clawdbot/clawdbot', pr: 1152 },
        description: 'Monitor a PR and report when it changes.',
      },
    ],
    sideEffects: [],
  },
  'github.pr.monitor.notify': {
    name: 'github.pr.monitor.notify',
    description: 'Monitor a PR and emit a single human-friendly message when it changes.',
    argsSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/repo (e.g. clawdbot/clawdbot)' },
        pr: { type: 'number', description: 'Pull request number' },
        key: { type: 'string', description: 'Optional state key override.' },
      },
      required: ['repo', 'pr'],
    },
    examples: [
      {
        args: { repo: 'clawdbot/clawdbot', pr: 1152 },
        description: 'Emit "PR updated" message only when changed.',
      },
    ],
    sideEffects: [],
  },
};

export function listWorkflows() {
  return Object.values(workflowRegistry).map((w) => ({
    name: w.name,
    description: w.description,
    argsSchema: w.argsSchema,
    examples: w.examples,
    sideEffects: w.sideEffects,
  }));
}
