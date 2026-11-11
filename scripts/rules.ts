import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

export interface Preset {
  name: string;
  file: string;
  title: string;
  intro: string;
}

export interface LintConfig {
  plugins: string[];
  categories: unknown;
  jsPlugins: string[];
  rules: Map<string, unknown>;
  overrides: unknown[];
}

export interface ExampleFile {
  name: string;
  code: string;
}

export interface RuleDoc {
  rule: string;
  preset: Preset;
  group: string;
  summary: string;
  why: string;
  note: string | undefined;
  checkOptions: object | undefined;
  bad: ExampleFile[];
  good: ExampleFile[];
}

export const REPO_ROOT = join(import.meta.dirname, '..');
export const RULES_DIR = join(REPO_ROOT, 'rules');
export const README_PATH = join(REPO_ROOT, 'README.md');

export const BASE: Preset = {
  name: 'base',
  file: 'base.json',
  title: 'Base rules',
  intro: '`base.json`, for every TypeScript project.',
};

export const PRESETS: readonly Preset[] = [
  BASE,
  {
    name: 'react',
    file: 'react.json',
    title: 'React rules',
    intro:
      '`react.json`, on top of `base.json` in React projects. It also turns on the correctness rules of the `react` and `jsx-a11y` plugins.',
  },
  {
    name: 'strict',
    file: 'strict.json',
    title: 'Strict rules',
    intro:
      '`strict.json`, an opt-in layer on top of `base.json` for projects that want named exports, no barrel files and kebab-case file names.',
  },
];

export function readPreset(preset: Preset): LintConfig {
  const parsed: unknown = JSON.parse(readFileSync(join(REPO_ROOT, preset.file), 'utf8'));
  if (!isLintConfigShape(parsed)) {
    throw new Error(`${preset.file} needs "plugins" and "rules"`);
  }

  const jsPlugins = 'jsPlugins' in parsed ? parsed.jsPlugins : [];
  if (!isStringList(parsed.plugins) || !isStringList(jsPlugins)) {
    throw new Error(`${preset.file} "plugins" and "jsPlugins" need to be lists of names`);
  }

  const overrides = 'overrides' in parsed && Array.isArray(parsed.overrides) ? parsed.overrides : [];

  return {
    plugins: parsed.plugins,
    categories: 'categories' in parsed ? parsed.categories : undefined,
    jsPlugins: jsPlugins.map((path) => resolve(REPO_ROOT, path)),
    rules: new Map(Object.entries(parsed.rules)),
    overrides,
  };
}

export function layeredConfig(preset: Preset): LintConfig {
  const base = readPreset(BASE);
  if (preset === BASE) {
    return base;
  }

  const layer = readPreset(preset);

  return {
    plugins: [...new Set([...base.plugins, ...layer.plugins])],
    categories: layer.categories ?? base.categories,
    jsPlugins: [...new Set([...base.jsPlugins, ...layer.jsPlugins])],
    rules: new Map([...base.rules, ...layer.rules]),
    overrides: [...base.overrides, ...layer.overrides],
  };
}

export function readRuleDocs(): RuleDoc[] {
  const docs: RuleDoc[] = [];
  const seen = new Map<string, Preset>();

  for (const preset of PRESETS) {
    for (const rule of readPreset(preset).rules.keys()) {
      const earlier = seen.get(rule);
      if (earlier !== undefined) {
        throw new Error(`${rule} is set in both ${earlier.file} and ${preset.file}`);
      }

      seen.set(rule, preset);
      docs.push(readRuleDoc(rule, preset));
    }
  }

  return docs;
}

export function expectedReadme(docs: readonly RuleDoc[]): string {
  const readme = readFileSync(README_PATH, 'utf8');
  const start = readme.indexOf(RULES_START);
  const end = readme.indexOf(RULES_END);
  if (start === -1 || end === -1) {
    throw new Error(`README.md needs ${RULES_START} and ${RULES_END}`);
  }

  const before = readme.slice(0, start + RULES_START.length);
  const after = readme.slice(end);

  return `${before}\n\n${renderRulesSection(docs)}\n\n${after}`;
}

export function folderNames(path: string): string[] {
  const entries = readdirSync(path, { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

const RULES_START = '<!-- rules:start -->';
const RULES_END = '<!-- rules:end -->';
const CODE_LANGUAGES = new Map([
  ['.ts', 'ts'],
  ['.tsx', 'tsx'],
  ['.txt', 'text'],
]);

interface RuleNotes {
  group: string;
  summary: string;
  why: string;
  note?: string;
  checkOptions?: object;
}

function readRuleDoc(rule: string, preset: Preset): RuleDoc {
  const folder = join(RULES_DIR, rule);
  const notesPath = join(folder, 'rule.json');
  if (!existsSync(notesPath)) {
    throw new Error(`${rule} is set in ${preset.file} but has no rules/${rule}/rule.json`);
  }

  const notes: unknown = JSON.parse(readFileSync(notesPath, 'utf8'));
  if (!isRuleNotes(notes)) {
    throw new Error(`rules/${rule}/rule.json needs "group", "summary" and "why" strings`);
  }

  return {
    rule,
    preset,
    group: notes.group,
    summary: notes.summary,
    why: notes.why,
    note: notes.note,
    checkOptions: notes.checkOptions,
    bad: readExample(folder, 'bad'),
    good: readExample(folder, 'good'),
  };
}

function readExample(folder: string, kind: 'bad' | 'good'): ExampleFile[] {
  const exampleFolder = join(folder, kind);
  if (existsSync(exampleFolder)) {
    return readExampleFolder(exampleFolder);
  }

  const fileName = readdirSync(folder).find((name) => name.startsWith(`${kind}.`));
  if (fileName === undefined) {
    throw new Error(`${folder} has no ${kind} example`);
  }

  return [{ name: fileName, code: readFileSync(join(folder, fileName), 'utf8') }];
}

function readExampleFolder(exampleFolder: string): ExampleFile[] {
  const entries = readdirSync(exampleFolder, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name);
  fileNames.sort((left, right) => left.localeCompare(right));

  return fileNames.map((name) => ({ name, code: readFileSync(join(exampleFolder, name), 'utf8') }));
}

function renderRulesSection(docs: readonly RuleDoc[]): string {
  const sections: string[] = [];

  for (const preset of PRESETS) {
    const presetDocs = docs.filter((doc) => doc.preset === preset);
    if (presetDocs.length === 0) {
      continue;
    }

    sections.push(`## ${preset.title}`, `Set in ${preset.intro}`);
    for (const [group, groupDocs] of groupedInOrder(presetDocs)) {
      sections.push(`### ${group}`);
      for (const doc of groupDocs) {
        sections.push(renderRule(doc));
      }
    }
  }

  return sections.join('\n\n');
}

function groupedInOrder(docs: readonly RuleDoc[]): Map<string, RuleDoc[]> {
  const groups = new Map<string, RuleDoc[]>();

  for (const doc of docs) {
    const groupDocs = groups.get(doc.group) ?? [];
    groupDocs.push(doc);
    groups.set(doc.group, groupDocs);
  }

  return groups;
}

function renderRule(doc: RuleDoc): string {
  const lines = [`#### \`${doc.rule}\``, '', doc.summary, '', `**Why:** ${doc.why}`];
  if (doc.note !== undefined) {
    lines.push('', doc.note);
  }
  lines.push('', 'Bad:', '', codeBlock(doc.bad), '', 'Good:', '', codeBlock(doc.good));

  return lines.join('\n');
}

function codeBlock(files: readonly ExampleFile[]): string {
  const firstName = files[0]?.name ?? '';
  const language = CODE_LANGUAGES.get(extname(firstName)) ?? 'ts';
  const body = files.length > 1 ? files.map((file) => withFileName(file)).join('\n') : (files[0]?.code ?? '');

  return `\`\`\`${language}\n${body.trimEnd()}\n\`\`\``;
}

function withFileName(file: ExampleFile): string {
  return `// ${file.name}\n${file.code}`;
}

function isLintConfigShape(value: unknown): value is { plugins: unknown; rules: object } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('plugins' in value) || !('rules' in value)) {
    return false;
  }

  return typeof value.rules === 'object' && value.rules !== null;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRuleNotes(value: unknown): value is RuleNotes {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const fields = new Map<string, unknown>(Object.entries(value));
  const hasText = (key: string): boolean => typeof fields.get(key) === 'string';
  const noteIsValid = !fields.has('note') || hasText('note');
  const checkOptions = fields.get('checkOptions');
  const checkOptionsIsValid = !fields.has('checkOptions') || (typeof checkOptions === 'object' && checkOptions !== null);

  return hasText('group') && hasText('summary') && hasText('why') && noteIsValid && checkOptionsIsValid;
}
