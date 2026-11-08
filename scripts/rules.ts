import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

export interface LintConfig {
  plugins: unknown;
  categories: unknown;
  jsPlugins: string[];
  rules: Map<string, unknown>;
}

export interface ExampleFile {
  name: string;
  code: string;
}

export interface RuleDoc {
  rule: string;
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

export function readLintConfig(): LintConfig {
  const parsed: unknown = JSON.parse(readFileSync(join(REPO_ROOT, '.oxlintrc.json'), 'utf8'));
  if (!isLintConfigShape(parsed)) throw new Error('.oxlintrc.json needs "plugins" and "rules"');

  const categories = 'categories' in parsed ? parsed.categories : undefined;
  const jsPlugins = 'jsPlugins' in parsed ? parsed.jsPlugins : [];
  if (!isStringList(jsPlugins)) throw new Error('.oxlintrc.json "jsPlugins" needs to be a list of paths');

  return {
    plugins: parsed.plugins,
    categories,
    jsPlugins: jsPlugins.map((path) => resolve(REPO_ROOT, path)),
    rules: new Map(Object.entries(parsed.rules)),
  };
}

export function readRuleDocs(rules: Iterable<string>): RuleDoc[] {
  return Array.from(rules, (rule) => readRuleDoc(rule));
}

export function expectedReadme(docs: readonly RuleDoc[]): string {
  const readme = readFileSync(README_PATH, 'utf8');
  const start = readme.indexOf(RULES_START);
  const end = readme.indexOf(RULES_END);
  if (start === -1 || end === -1) throw new Error(`README.md needs ${RULES_START} and ${RULES_END}`);

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
  ['.txt', 'text'],
]);

interface RuleNotes {
  group: string;
  summary: string;
  why: string;
  note?: string;
  checkOptions?: object;
}

function readRuleDoc(rule: string): RuleDoc {
  const folder = join(RULES_DIR, rule);
  const notesPath = join(folder, 'rule.json');
  if (!existsSync(notesPath)) throw new Error(`${rule} is set in .oxlintrc.json but has no rules/${rule}/rule.json`);

  const notes: unknown = JSON.parse(readFileSync(notesPath, 'utf8'));
  if (!isRuleNotes(notes)) throw new Error(`rules/${rule}/rule.json needs "group", "summary" and "why" strings`);

  return {
    rule,
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
  if (existsSync(exampleFolder)) return readExampleFolder(exampleFolder);

  const fileName = readdirSync(folder).find((name) => name.startsWith(`${kind}.`));
  if (fileName === undefined) throw new Error(`${folder} has no ${kind} example`);

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

  for (const [group, groupDocs] of groupedInOrder(docs)) {
    sections.push(`### ${group}`);
    for (const doc of groupDocs) sections.push(renderRule(doc));
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
  if (doc.note !== undefined) lines.push('', doc.note);
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
  if (typeof value !== 'object' || value === null) return false;
  if (!('plugins' in value) || !('rules' in value)) return false;

  return typeof value.rules === 'object' && value.rules !== null;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRuleNotes(value: unknown): value is RuleNotes {
  if (typeof value !== 'object' || value === null) return false;

  const fields = new Map<string, unknown>(Object.entries(value));
  const hasText = (key: string): boolean => typeof fields.get(key) === 'string';
  const noteIsValid = !fields.has('note') || hasText('note');
  const checkOptions = fields.get('checkOptions');
  const checkOptionsIsValid = !fields.has('checkOptions') || (typeof checkOptions === 'object' && checkOptions !== null);

  return hasText('group') && hasText('summary') && hasText('why') && noteIsValid && checkOptionsIsValid;
}
