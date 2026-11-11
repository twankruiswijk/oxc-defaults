import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { folderNames, PRESETS, REPO_ROOT } from './rules.ts';

const FIXTURES_DIR = join(REPO_ROOT, 'fixtures');
const WORK_DIR = mkdtempSync(join(tmpdir(), 'oxc-defaults-fixtures-'));
const OXLINT = join(REPO_ROOT, 'node_modules', '.bin', 'oxlint');
const DIAGNOSTIC = /^(.+?):\d+:\d+: .* \[(?:Error|Warning)\/([\w-]+)\(([\w-]+)\)\]$/gm;
const PLUGIN_ALIASES = new Map([['react-hooks', 'react']]);

const problems: string[] = [];
const fixtures = folderNames(FIXTURES_DIR);

for (const fixture of fixtures) {
  problems.push(...fixtureProblems(fixture));
}

rmSync(WORK_DIR, { recursive: true, force: true });

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`${fixtures.length} fixtures checked: each project that extends the presets gets exactly the expected errors`);

function fixtureProblems(fixture: string): string[] {
  const folder = installFixture(fixture);
  const expected = readExpected(fixture);
  const actual = flaggedRules(folder);
  const problemsFound: string[] = [];

  for (const file of new Set([...expected.keys(), ...actual.keys()])) {
    const want = [...(expected.get(file) ?? [])].sort();
    const got = [...(actual.get(file) ?? [])].sort();
    if (want.join() !== got.join()) {
      problemsFound.push(`fixtures/${fixture}/${file}: expected [${want.join(', ')}], got [${got.join(', ')}]`);
    }
  }

  return problemsFound;
}

function installFixture(fixture: string): string {
  const folder = join(WORK_DIR, fixture);
  cpSync(join(FIXTURES_DIR, fixture), folder, { recursive: true });
  mkdirSync(join(folder, 'oxc'));
  for (const preset of PRESETS) {
    cpSync(join(REPO_ROOT, preset.file), join(folder, 'oxc', preset.file));
  }
  cpSync(join(REPO_ROOT, 'plugins'), join(folder, 'oxc', 'plugins'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules'), join(folder, 'node_modules'));

  return folder;
}

function readExpected(fixture: string): Map<string, Set<string>> {
  const parsed: unknown = JSON.parse(readFileSync(join(FIXTURES_DIR, fixture, 'expected.json'), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`fixtures/${fixture}/expected.json needs an object of file paths to rule lists`);
  }

  const expected = new Map<string, Set<string>>();
  for (const [file, rules] of Object.entries(parsed)) {
    if (!Array.isArray(rules) || !rules.every((rule) => typeof rule === 'string')) {
      throw new Error(`fixtures/${fixture}/expected.json: ${file} needs a list of rule names`);
    }
    expected.set(file, new Set(rules));
  }

  return expected;
}

function flaggedRules(folder: string): Map<string, Set<string>> {
  const linted = spawnSync(OXLINT, ['-f', 'unix', '--type-aware', 'src'], { cwd: folder, encoding: 'utf8' });
  if (linted.error !== undefined) {
    throw linted.error;
  }

  const flagged = new Map<string, Set<string>>();
  for (const [, file = '', plugin = '', name] of linted.stdout.matchAll(DIAGNOSTIC)) {
    const rules = flagged.get(file) ?? new Set<string>();
    rules.add(`${PLUGIN_ALIASES.get(plugin) ?? plugin}/${name}`);
    flagged.set(file, rules);
  }

  const oxlintFailed = linted.status !== 0 && flagged.size === 0;
  if (oxlintFailed) {
    throw new Error(`oxlint failed in ${folder}:\n${linted.stdout}${linted.stderr}`);
  }

  return flagged;
}
