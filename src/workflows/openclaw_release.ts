import { parsePipeline } from '../parser.js';
import { runPipeline } from '../runtime.js';

function assertStyle(value: unknown): 'sassy' | 'professional' | 'drybread' {
  const v = String(value ?? 'professional').trim().toLowerCase();
  if (v === 'sassy' || v === 'professional' || v === 'drybread') return v;
  return 'professional';
}

function jsonEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
}

function buildContextShell({ repoDir, sinceRef, maxCommits, link, style }: any) {
  // Produce a single JSON object on stdout.
  // Uses jq for safe JSON construction.
  return [
    `cd '${jsonEscape(repoDir)}'`,
    `SINCE='${jsonEscape(sinceRef || `HEAD~${Number(maxCommits) || 30}`)}'`,
    `COMMITS=$(git log --no-merges --pretty=format:'%h %s (%an)' "$SINCE..HEAD" | head -n 80 | jq -R -s -c 'split("\\n")|map(select(length>0))')`,
    // Grab the topmost changelog section (first "## " header block)
    `CHANGELOG=$(node -e "const fs=require('fs'); const t=fs.readFileSync('CHANGELOG.md','utf8'); const parts=t.split(/\\n## /); const top=(parts.length>1?('## '+parts[1]).split(/\\n## /)[0]:t); process.stdout.write(top.slice(0,6000));")`,
    `jq -n --arg repo 'openclaw' --arg style '${jsonEscape(style)}' --arg since "$SINCE" --arg link '${jsonEscape(link)}' --argjson commits "$COMMITS" --arg changelog "$CHANGELOG" '{repo:$repo,style:$style,since:$since,link:$link,commits:$commits,changelog:$changelog}'`,
  ].join(' && ');
}

function buildTweetPrompt() {
  return (
    `You are writing a release tweet for OpenClaw.\n\n` +
    `Input JSON has: style (sassy|professional|drybread), since, link, commits[], changelog.\n\n` +
    `Write ONE tweet in the requested style.\n` +
    `Constraints:\n` +
    `- <= 260 characters\n` +
    `- Include the link exactly once (use the provided link field)\n` +
    `- Don\'t hallucinate features\n` +
    `- No hashtags unless truly helpful (max 1)\n\n` +
    `Return JSON: {"tweet":"...","style":"..."}.\n\n` +
    `INPUT:\n{{.}}`
  );
}

export async function runOpenclawReleaseTweetWorkflow({ args, ctx }: any) {
  const repoDir = String(args.repo_dir ?? args.repoDir ?? '../openclaw');
  const style = assertStyle(args.style);
  const sinceRef = String(args.since_ref ?? args.sinceRef ?? '').trim();
  const maxCommits = Number(args.max_commits ?? args.maxCommits ?? 30);
  const link = String(args.link ?? 'https://openclaw.dev');

  const contextShell = buildContextShell({ repoDir, sinceRef, maxCommits, link, style });

  const pipelineString = [
    `exec --json --shell '${jsonEscape(contextShell)}'`,
    `llm_task.invoke --schema '{"type":"object","properties":{"tweet":{"type":"string"},"style":{"type":"string"}},"required":["tweet","style"],"additionalProperties":false}' --prompt '${jsonEscape(buildTweetPrompt())}'`,
    // Human approval (interactive by default; emits approval_request in tool/non-tty)
    `approve --preview-from-stdin --limit 1 --prompt 'Post this release tweet?'`,
    // Output tweet object (for display or piping)
    `pick tweet,style`,
  ].join(' | ');

  const pipeline = parsePipeline(pipelineString);
  const output = await runPipeline({
    pipeline,
    registry: ctx.registry,
    input: [],
    stdin: ctx.stdin,
    stdout: ctx.stdout,
    stderr: ctx.stderr,
    env: ctx.env,
    mode: ctx.mode,
  });

  // In human mode, approve passes items through. In tool mode, approve halts; cli will wrap.
  return {
    kind: 'openclaw.release.tweet',
    style,
    since: sinceRef || `HEAD~${maxCommits}`,
    items: output.items,
    halted: output.halted,
  };
}

export async function runOpenclawReleasePostWorkflow({ args, ctx }: any) {
  const repoDir = String(args.repo_dir ?? args.repoDir ?? '../openclaw');
  const style = assertStyle(args.style);
  const sinceRef = String(args.since_ref ?? args.sinceRef ?? '').trim();
  const maxCommits = Number(args.max_commits ?? args.maxCommits ?? 30);
  const link = String(args.link ?? 'https://openclaw.dev');

  const contextShell = buildContextShell({ repoDir, sinceRef, maxCommits, link, style });

  const pipelineString = [
    `exec --json --shell '${jsonEscape(contextShell)}'`,
    `llm_task.invoke --schema '{"type":"object","properties":{"tweet":{"type":"string"},"style":{"type":"string"}},"required":["tweet","style"],"additionalProperties":false}' --prompt '${jsonEscape(buildTweetPrompt())}'`,
    `approve --preview-from-stdin --limit 1 --prompt 'Post this release tweet to X?'`,
    // Post to X via bird; uses stdin json array from previous stage.
    `exec --stdin json --shell 'T=$(cat | jq -r ".[0].tweet"); bird post --text "$T"; echo "{\\"posted\\":true}"' --json`,
  ].join(' | ');

  const pipeline = parsePipeline(pipelineString);
  const output = await runPipeline({
    pipeline,
    registry: ctx.registry,
    input: [],
    stdin: ctx.stdin,
    stdout: ctx.stdout,
    stderr: ctx.stderr,
    env: ctx.env,
    mode: ctx.mode,
  });

  return {
    kind: 'openclaw.release.post',
    style,
    since: sinceRef || `HEAD~${maxCommits}`,
    items: output.items,
    halted: output.halted,
  };
}
