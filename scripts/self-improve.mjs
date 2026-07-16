#!/usr/bin/env node
// scripts/self-improve.mjs
// ════════════════════════════════════════════════════════════════════
// Studio P — Nightly AI Self-Improvement Agent (Google Gemini)
//
// Uses gemini-2.0-flash via @google/generative-ai with function calling
// to review src/ and apply targeted fixes. Free tier: 1,500 req/day.
//
// Safety guardrails (enforced in JS, independent of the model):
//   - Only src/**/*.ts and src/**/*.tsx may be written
//   - Blocked: package.json, .env*, supabase/, vercel.json, api/, scripts/
//   - Max 40 tool calls total
//   - Max 8 files modified per run
//   - Tool errors returned to model (not thrown) so it can adapt
// ════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from '@google/generative-ai';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

// ── Constants ──────────────────────────────────────────────────────────────

const ROOT               = resolve(process.cwd());
const SRC_DIR            = join(ROOT, 'src');
const SUMMARY_PATH       = '/tmp/improve-summary.json';
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

const changedFiles = [];
let toolCallCount  = 0;
let sessionDone    = false;

// ── Tool implementations ───────────────────────────────────────────────────

function listFiles() {
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
  return JSON.stringify(results.sort((a, b) => a.path.localeCompare(b.path)), null, 2);
}

function readFile({ path: relPath }) {
  const norm = relPath.replace(/^\//, '');
  const abs  = resolve(ROOT, norm);
  if (!abs.startsWith(SRC_DIR + '/') && abs !== SRC_DIR) {
    return `ERROR: "${relPath}" is outside src/`;
  }
  try {
    const content = readFileSync(abs, 'utf8');
    return content.split('\n').map((l, i) => `${String(i + 1).padStart(4)} | ${l}`).join('\n');
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function writeFile({ path: relPath, content, reason }) {
  const norm = relPath.replace(/^\//, '');
  for (const pattern of BLOCKED_WRITE_PATTERNS) {
    if (pattern.test(norm)) return `ERROR: "${relPath}" is blocked by safety policy`;
  }
  const abs = resolve(ROOT, norm);
  if (!abs.startsWith(SRC_DIR + '/')) return `ERROR: "${relPath}" is outside src/`;
  if (!/\.(ts|tsx)$/.test(norm)) return `ERROR: only .ts/.tsx may be written`;

  const already = changedFiles.find(c => c.file === norm);
  if (!already && changedFiles.length >= MAX_FILES_MODIFIED) {
    return `ERROR: file modification limit (${MAX_FILES_MODIFIED}) reached`;
  }

  // Guard: if the model echoed read_file's line-number prefixes back, strip them.
  // A genuine source file will never start the majority of its lines with "NNN | ".
  const lineNumberPrefix = /^ *\d+ \| /;
  const lines = content.split('\n');
  const prefixedCount = lines.filter(l => lineNumberPrefix.test(l)).length;
  if (prefixedCount > lines.length * 0.5) {
    content = lines.map(l => l.replace(lineNumberPrefix, '')).join('\n');
    console.warn(`  [write_file] WARNING: stripped line-number prefixes from ${norm} (${prefixedCount}/${lines.length} lines were prefixed)`);
  }

  try {
    writeFileSync(abs, content, 'utf8');
    if (already) already.reason = reason ?? already.reason;
    else changedFiles.push({ file: norm, reason: reason ?? 'No reason provided' });
    return `Written: ${norm} (${content.split('\n').length} lines)`;
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
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

function done({ summary }) {
  sessionDone = true;
  return `Session complete: ${summary}`;
}

// ── Gemini tool declarations ───────────────────────────────────────────────

const TOOL_DECLARATIONS = {
  functionDeclarations: [
    {
      name: 'list_files',
      description: 'Lists all TypeScript source files under src/ with path and line count. Call this first.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    {
      name: 'read_file',
      description: 'Reads a src/ TypeScript file and returns its content with line numbers prepended for reference ONLY. IMPORTANT: when you call write_file, the content MUST NOT include these line numbers — write raw source code only.',
      parameters: {
        type: 'OBJECT',
        properties: {
          path: { type: 'STRING', description: 'Relative path from project root, e.g. "src/lib/supabase.ts".' },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Overwrites a src/ TypeScript file. Write the COMPLETE new content — raw source code only, no line numbers, no partial diffs, no placeholders.',
      parameters: {
        type: 'OBJECT',
        properties: {
          path:    { type: 'STRING', description: 'Relative path from project root.' },
          content: { type: 'STRING', description: 'Complete new file content.' },
          reason:  { type: 'STRING', description: 'One sentence describing what was fixed. Shown in the PR.' },
        },
        required: ['path', 'content', 'reason'],
      },
    },
    {
      name: 'run_typecheck',
      description: 'Runs `tsc --noEmit`. Use at start to see errors and after writes to verify fixes.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    {
      name: 'done',
      description: 'Signal session complete. Call when all improvements are done or nothing remains.',
      parameters: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING', description: 'Short paragraph summarising what was reviewed and fixed.' },
        },
        required: ['summary'],
      },
    },
  ],
};

// ── Tool dispatcher ────────────────────────────────────────────────────────

function dispatchTool(name, args) {
  switch (name) {
    case 'list_files':    return listFiles();
    case 'read_file':     return readFile(args);
    case 'write_file':    return writeFile(args);
    case 'run_typecheck': return runTypecheck();
    case 'done':          return done(args);
    default:              return `ERROR: Unknown tool "${name}"`;
  }
}

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a TypeScript code quality agent for Studio P, a barbershop booking app (React 19, TypeScript 6 strict mode, Vite 8, Supabase). You run nightly as part of an automated pipeline. Your changes will be opened as a pull request for a human to review.

## What to fix (priority order)
1. TypeScript errors from tsc --noEmit
2. Unsafe type assertions (as SomeType casts hiding runtime errors)
3. Unhandled promise rejections (async without try-catch or .catch())
4. Missing null/undefined guards at property access sites
5. Missing React key props on .map() JSX
6. Security: unvalidated user input into Supabase queries or URLs
7. Accessibility: interactive elements missing aria-label with no visible text

## What NOT to do
- Do NOT include line numbers in write_file content — read_file adds "NNN | " prefixes for display only; they must never appear in file content you write
- Do NOT change visible behaviour, UI layout, or design
- Do NOT rename identifiers unless it is a typo causing a type error
- Do NOT add new features, imports, or packages
- Do NOT touch files outside src/ (package.json, .env*, supabase/, vercel.json, api/, scripts/, .github/)
- Do NOT reformat code for style alone
- Do NOT touch @/* path alias imports — they are correct (bundler-resolved)
- Do NOT make wholesale rewrites — make the smallest change that fixes the issue

## Project facts
- TypeScript 6, strict mode, moduleResolution: "bundler"
- React 19, Supabase singleton at src/lib/supabase.ts
- BookingService uses intentional Promise.all — do not serialise
- Demo mode gated by import.meta.env.VITE_ENABLE_DEMO_MODE — do not remove
- Budget: 40 tool calls, 8 files max

## Workflow
1. list_files() to see scope
2. run_typecheck() for baseline errors
3. read_file() on files with errors, then larger service/component files
4. write_file() with complete new content for each fix
5. run_typecheck() to verify no new errors introduced
6. done() when finished`;

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not set');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [TOOL_DECLARATIONS],
    toolConfig: { functionCallingConfig: { mode: 'ANY' } },
  });

  const tscBaseline = process.env.TSC_BASELINE ?? '';
  const initialPrompt = [
    '## Baseline tsc output',
    '```',
    tscBaseline || '(no errors at baseline)',
    '```',
    '',
    'Please start by calling list_files() to see the source files, then run_typecheck() for baseline errors, then review and fix issues.',
  ].join('\n');

  console.log(`Self-improvement agent starting (Gemini). Budget: ${MAX_TOOL_CALLS} tool calls, ${MAX_FILES_MODIFIED} files.`);

  const chat = model.startChat({ history: [] });

  // Retry wrapper for 429 rate-limit errors
  async function sendWithRetry(msg, maxRetries = 4) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return (await chat.sendMessage(msg)).response;
      } catch (err) {
        const is429 = err?.status === 429 || String(err?.message).includes('429');
        if (!is429 || attempt === maxRetries) throw err;
        const wait = (2 ** attempt) * 15_000; // 15s, 30s, 60s, 120s
        console.log(`  [rate-limit] 429 received — retrying in ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  // SDK returns { response: EnhancedGenerateContentResponse } — unwrap immediately
  let response = await sendWithRetry(initialPrompt);

  while (toolCallCount < MAX_TOOL_CALLS && !sessionDone) {
    const candidate = response.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content?.parts ?? [];
    const fnCalls = parts.filter(p => p.functionCall);

    console.log(`[turn] finish=${candidate.finishReason} fn_calls=${fnCalls.length} budget_used=${toolCallCount}`);

    if (fnCalls.length === 0) break;

    const fnResponses = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      toolCallCount++;
      console.log(`  [#${toolCallCount}] ${name}(${JSON.stringify(args).slice(0, 100)})`);

      const result = dispatchTool(name, args ?? {});

      fnResponses.push({
        functionResponse: {
          name,
          response: { result },
        },
      });

      if (sessionDone) break;
    }

    if (sessionDone) break;
    response = await sendWithRetry(fnResponses);
  }

  if (toolCallCount >= MAX_TOOL_CALLS && !sessionDone) {
    console.log(`Budget exhausted (${toolCallCount} tool calls).`);
  }

  writeFileSync(SUMMARY_PATH, JSON.stringify({ changes: changedFiles }, null, 2), 'utf8');

  console.log(`\n=== Done. Modified ${changedFiles.length} file(s): ===`);
  for (const c of changedFiles) console.log(`  ${c.file}: ${c.reason}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
