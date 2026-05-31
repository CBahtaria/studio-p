#!/usr/bin/env node
// scripts/self-improve.mjs
// ════════════════════════════════════════════════════════════════════
// Studio P — Nightly AI Self-Improvement Agent
//
// Uses Anthropic claude-sonnet-4-6 with tool use to review src/ and
// apply targeted fixes. Writes a machine-readable summary to
// /tmp/improve-summary.json for the GitHub Actions PR body.
//
// Safety guardrails (enforced in JS, independent of the model):
//   - Only src/**/*.ts and src/**/*.tsx may be written
//   - Blocked: package.json, .env*, supabase/, vercel.json, api/, scripts/
//   - Max 40 tool calls total
//   - Max 8 files modified per run
//   - Tool errors are returned to Claude (not thrown), so it can adapt
// ════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

// ── Constants ──────────────────────────────────────────────────────────────

const ROOT          = resolve(process.cwd());
const SRC_DIR       = join(ROOT, 'src');
const SUMMARY_PATH  = '/tmp/improve-summary.json';
const MAX_TOOL_CALLS     = 40;
const MAX_FILES_MODIFIED = 8;

const BLOCKED_WRITE_PATTERNS = [
  /^package(-lock)?\.json$/,
  /^\.env/,
  /^supabase\//,
  /^vercel\.json$/,
  /^api\//,
  /^\.github\//,
  /^scripts\//,
  /^dist\//,
  /^node_modules\//,
  /^tsconfig/,
  /^vite\.config/,
  /^middleware\./,
  /^index\.html$/,
];

// ── State ──────────────────────────────────────────────────────────────────

const changedFiles  = [];  // { file: string, reason: string }
let toolCallCount   = 0;
let sessionDone     = false;

// ── Helpers ────────────────────────────────────────────────────────────────

function listSrcFiles() {
  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const lines = readFileSync(full, 'utf8').split('\n').length;
        results.push({ path: relative(ROOT, full), lines });
      }
    }
  }
  walk(SRC_DIR);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

function readFile(relPath) {
  const norm = relPath.replace(/^\//, '');
  const abs  = resolve(ROOT, norm);
  if (!abs.startsWith(SRC_DIR + '/') && abs !== SRC_DIR) {
    throw new Error(`read_file: "${relPath}" is outside src/`);
  }
  const content = readFileSync(abs, 'utf8');
  return content
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4)} | ${line}`)
    .join('\n');
}

function writeFile(relPath, content, reason) {
  const norm = relPath.replace(/^\//, '');

  for (const pattern of BLOCKED_WRITE_PATTERNS) {
    if (pattern.test(norm)) {
      throw new Error(`write_file: "${relPath}" is blocked by safety policy`);
    }
  }

  const abs = resolve(ROOT, norm);
  if (!abs.startsWith(SRC_DIR + '/')) {
    throw new Error(`write_file: "${relPath}" is outside src/`);
  }
  if (!/\.(ts|tsx)$/.test(norm)) {
    throw new Error(`write_file: only .ts/.tsx may be written, got "${relPath}"`);
  }

  const already = changedFiles.find(c => c.file === norm);
  if (!already && changedFiles.length >= MAX_FILES_MODIFIED) {
    throw new Error(`write_file: file modification limit (${MAX_FILES_MODIFIED}) reached`);
  }

  writeFileSync(abs, content, 'utf8');

  if (already) {
    already.reason = reason ?? already.reason;
  } else {
    changedFiles.push({ file: norm, reason: reason ?? 'No reason provided' });
  }

  return `Written: ${norm} (${content.split('\n').length} lines)`;
}

function runTypecheck() {
  try {
    const out = execSync('node_modules/.bin/tsc --noEmit 2>&1', {
      cwd: ROOT, encoding: 'utf8', stdio: 'pipe',
    });
    return `Exit code: 0\n\n${out || '(no errors)'}`;
  } catch (e) {
    return `Exit code: ${e.status ?? 1}\n\n${(e.stdout ?? '') + (e.stderr ?? '')}`;
  }
}

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_files',
    description:
      'Lists all TypeScript source files under src/ with their path and line count. ' +
      'Call this first to understand scope.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_file',
    description: 'Reads a src/ TypeScript file and returns its content with line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path from project root, e.g. "src/lib/supabase.ts".',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description:
      'Overwrites a src/ TypeScript file. Write the COMPLETE new file — never a partial diff. ' +
      'Only call after reading the current content and forming a concrete fix.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path from project root.',
        },
        content: {
          type: 'string',
          description: 'Complete new file content. No placeholders like "// rest unchanged".',
        },
        reason: {
          type: 'string',
          description: 'One sentence describing what was fixed. Shown to the human reviewer in the PR.',
        },
      },
      required: ['path', 'content', 'reason'],
    },
  },
  {
    name: 'run_typecheck',
    description:
      'Runs `tsc --noEmit` and returns compiler output. ' +
      'Use at the start to see baseline errors, and after writing to verify fixes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'done',
    description:
      'Signal that the session is complete. Call when all improvements are done or nothing remains to fix.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Short paragraph describing what was reviewed and what was fixed (or why nothing was changed).',
        },
      },
      required: ['summary'],
    },
  },
];

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a TypeScript code quality agent for Studio P, a barbershop booking app (React 19, TypeScript 6 strict mode, Vite 8, Supabase). You run nightly as part of an automated pipeline. Your changes will be opened as a pull request — a human reviews before merging.

## What to fix (priority order)

1. TypeScript errors — fix anything reported by tsc --noEmit first.
2. Unsafe type assertions — replace \`as SomeType\` casts that hide real runtime errors with type guards or proper narrowing.
3. Unhandled promise rejections — async functions or .then() chains missing catch / try-catch.
4. Missing null / undefined guards — property access on potentially-null values without a guard.
5. Missing React key props — .map() returning JSX without a stable \`key\` attribute.
6. Security — unvalidated user input passed directly into Supabase queries or URLs.
7. Accessibility — interactive elements (buttons, custom clickable divs) with no visible text label and no aria-label.

## What NOT to do

- Do NOT change visible behaviour, UI layout, or design.
- Do NOT rename identifiers unless the current name is a typo causing a type error.
- Do NOT add new features, new imports, or new npm packages.
- Do NOT modify any file outside src/. Off-limits: package.json, .env*, supabase/, vercel.json, api/, scripts/, .github/, tsconfig*, vite.config*.
- Do NOT reformat code for style alone (spacing, ordering) unless directly part of a fix.
- Do NOT remove comments unless they are factually wrong.
- Do NOT touch \`@/*\` path alias imports — they are correct and resolved by the bundler, not Node.js.
- Do NOT make wholesale rewrites. Make the smallest change that fixes the issue.

## Important project facts

- TypeScript config: strict, noUnusedLocals, noUnusedParameters, moduleResolution: "bundler".
- \`@/*\` alias resolves to \`src/*\`. Leave all such imports as-is.
- React 19: hooks follow React 19 patterns.
- Supabase singleton at src/lib/supabase.ts; all auth/DB/storage uses this client.
- BookingService and AgentPanel use intentional Promise.all for parallel validation — do not serialise.
- Demo mode is gated by \`import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'\` — never remove this guard.
- ProfileService.generateInitialsAvatar uses document.createElement intentionally (browser-only).

## Budget

40 tool calls maximum. 8 files maximum. Use them on real issues, not cosmetic ones.

## Workflow

1. Call list_files() to see the file tree.
2. Call run_typecheck() to get baseline errors.
3. Read files with errors first, then larger service/component files.
4. For each concrete fix, call write_file() with the COMPLETE new content.
5. After each write batch, call run_typecheck() to confirm no new errors.
6. When done, call done().`;

// ── Tool dispatcher ────────────────────────────────────────────────────────

function dispatchTool(name, input) {
  switch (name) {
    case 'list_files':
      return JSON.stringify(listSrcFiles(), null, 2);
    case 'read_file':
      return readFile(input.path);
    case 'write_file':
      return writeFile(input.path, input.content, input.reason);
    case 'run_typecheck':
      return runTypecheck();
    case 'done':
      sessionDone = true;
      return `Session complete: ${input.summary}`;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const tscBaseline = process.env.TSC_BASELINE ?? '';
  const fileListing = JSON.stringify(listSrcFiles(), null, 2);

  const initialMsg = [
    '## Baseline tsc output',
    '```',
    tscBaseline || '(no errors at baseline)',
    '```',
    '',
    '## Source file inventory',
    '```json',
    fileListing,
    '```',
    '',
    'Please review the source files and apply improvements. Start with files that have tsc errors, then move to the larger service and component files.',
  ].join('\n');

  const messages = [{ role: 'user', content: initialMsg }];

  console.log(`Self-improvement agent starting. Budget: ${MAX_TOOL_CALLS} tool calls, ${MAX_FILES_MODIFIED} files.`);

  while (toolCallCount < MAX_TOOL_CALLS && !sessionDone) {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 8192,
      system:     SYSTEM_PROMPT,
      tools:      TOOLS,
      messages,
    });

    const toolBlocks = response.content.filter(b => b.type === 'tool_use');
    console.log(`[turn] stop=${response.stop_reason} tools=${toolBlocks.length} budget_used=${toolCallCount}`);

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const results = [];

      for (const block of toolBlocks) {
        toolCallCount++;
        console.log(`  [#${toolCallCount}] ${block.name}(${JSON.stringify(block.input).slice(0, 100)})`);

        let resultContent;
        try {
          resultContent = dispatchTool(block.name, block.input);
        } catch (err) {
          resultContent = `ERROR: ${err.message}`;
          console.error(`  [error] ${err.message}`);
        }

        results.push({ type: 'tool_result', tool_use_id: block.id, content: resultContent });

        if (sessionDone) break;
      }

      messages.push({ role: 'user', content: results });
    }
  }

  if (toolCallCount >= MAX_TOOL_CALLS && !sessionDone) {
    console.log(`Budget exhausted (${toolCallCount} tool calls).`);
  }

  writeFileSync(SUMMARY_PATH, JSON.stringify({ changes: changedFiles }, null, 2), 'utf8');

  console.log(`\n=== Done. Modified ${changedFiles.length} file(s): ===`);
  for (const c of changedFiles) console.log(`  ${c.file}: ${c.reason}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
