import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type ExampleFile,
  expectedReadme,
  folderNames,
  type LintConfig,
  README_PATH,
  readLintConfig,
  readRuleDocs,
  REPO_ROOT,
  RULES_DIR,
  type RuleDoc,
} from './rules.ts';

const WORK_DIR = mkdtempSync(join(tmpdir(), 'oxc-defaults-check-'));
const OXLINT = join(REPO_ROOT, 'node_modules', '.bin', 'oxlint');
const DIAGNOSTIC_RULE = /\[(?:Error|Warning)\/(\w+)\(([\w-]+)\)\]/g;
const EXAMPLE_TSCONFIG = {
  compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', noEmit: true },
  include: ['**/*.ts'],
};

const config = readLintConfig();
const docs = readRuleDocs(config.rules.keys());
const problems: string[] = [];
symlinkSync(join(REPO_ROOT, 'node_modules'), join(WORK_DIR, 'node_modules'));

problems.push(...unconfiguredRuleFolders(config));

for (const doc of docs) {
  problems.push(...exampleProblems(doc, config));
}

problems.push(...readmeProblems(docs));
rmSync(WORK_DIR, { recursive: true, force: true });

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`${docs.length} rules checked: every bad example is flagged, every good example is clean and README.md is current`);

function unconfiguredRuleFolders(lintConfig: LintConfig): string[] {
  const problemsFound: string[] = [];

  for (const plugin of folderNames(RULES_DIR)) {
    for (const name of folderNames(join(RULES_DIR, plugin))) {
      const rule = `${plugin}/${name}`;
      if (!lintConfig.rules.has(rule)) {
        problemsFound.push(`rules/${rule} documents a rule that .oxlintrc.json does not set`);
      }
    }
  }

  return problemsFound;
}

function exampleProblems(doc: RuleDoc, lintConfig: LintConfig): string[] {
  const ruleSetting = checkedSetting(lintConfig.rules.get(doc.rule), doc.checkOptions);
  const onlyThisRule = {
    plugins: lintConfig.plugins,
    jsPlugins: lintConfig.jsPlugins,
    categories: { correctness: 'off' },
    rules: { [doc.rule]: ruleSetting },
  };
  const everyRule = {
    plugins: lintConfig.plugins,
    jsPlugins: lintConfig.jsPlugins,
    categories: lintConfig.categories,
    rules: { ...Object.fromEntries(lintConfig.rules), [doc.rule]: ruleSetting },
  };
  const problemsFound: string[] = [];

  const badRules = rulesFlagging(doc, 'bad', onlyThisRule);
  if (!badRules.includes(doc.rule)) {
    problemsFound.push(`${doc.rule}: the bad example is not flagged`);
  }

  const goodRules = rulesFlagging(doc, 'good', everyRule);
  if (goodRules.length > 0) {
    problemsFound.push(`${doc.rule}: the good example is flagged by ${[...new Set(goodRules)].join(', ')}`);
  }

  return problemsFound;
}

function checkedSetting(setting: unknown, checkOptions: object | undefined): unknown {
  if (checkOptions === undefined) {
    return setting;
  }

  const [severity, options] = Array.isArray(setting) ? setting : [setting, {}];
  if (typeof options !== 'object' || options === null) {
    throw new Error('checkOptions needs a rule whose options are an object');
  }

  return [severity, { ...options, ...checkOptions }];
}

function rulesFlagging(doc: RuleDoc, kind: 'bad' | 'good', lintConfig: object): string[] {
  const folder = join(WORK_DIR, doc.rule, kind);
  writeExampleFolder(folder, doc[kind], lintConfig);

  const linted = spawnSync(OXLINT, ['-c', 'oxlintrc.json', '-f', 'unix', '--type-aware', '.'], { cwd: folder, encoding: 'utf8' });
  if (linted.error !== undefined) {
    throw linted.error;
  }

  const flaggedBy = Array.from(linted.stdout.matchAll(DIAGNOSTIC_RULE), ([, plugin, name]) => `${plugin}/${name}`);
  const oxlintFailed = linted.status !== 0 && flaggedBy.length === 0;
  if (oxlintFailed) {
    throw new Error(`oxlint failed on the ${kind} example of ${doc.rule}:\n${linted.stdout}${linted.stderr}`);
  }

  return flaggedBy;
}

function writeExampleFolder(folder: string, files: readonly ExampleFile[], lintConfig: object): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });

  for (const file of files) {
    writeFileSync(join(folder, file.name), file.code);
  }
  writeFileSync(join(folder, 'tsconfig.json'), JSON.stringify(EXAMPLE_TSCONFIG));
  writeFileSync(join(folder, 'oxlintrc.json'), JSON.stringify(lintConfig));
}

function readmeProblems(ruleDocs: readonly RuleDoc[]): string[] {
  const currentReadme = readFileSync(README_PATH, 'utf8');
  if (currentReadme === expectedReadme(ruleDocs)) {
    return [];
  }

  return ['README.md is out of date: run pnpm readme'];
}
