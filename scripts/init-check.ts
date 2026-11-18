import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './rules.ts';

interface Setup {
  name: string;
  args: string[];
  file: string;
  code: string;
  flagged: string[];
}

const WORK_DIR = mkdtempSync(join(tmpdir(), 'oxc-defaults-init-'));
const INIT = join(REPO_ROOT, 'scripts', 'init.ts');
const OXLINT = join(REPO_ROOT, 'node_modules', '.bin', 'oxlint');
const TSCONFIG = { compilerOptions: { strict: true, module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', noEmit: true } };
const DIAGNOSTIC_RULE = /\[(?:Error|Warning)\/([\w-]+)\(([\w-]+)\)\]/g;
const RECIPE_CODE = 'export const Save = () => <button type="button" className="w-[13px] text-red-500">Save</button>;\n';
const SETUPS: readonly Setup[] = [
  {
    name: 'typescript',
    args: [],
    file: 'src/total.ts',
    code: 'export function total(prices: number[]): number {\n  let sum = 0;\n  for (const price of prices) {\n    sum += price;\n  }\n\n  return sum;\n}\n',
    flagged: [],
  },
  {
    name: 'everything',
    args: [
      '--react',
      '--strict',
      '--tailwind',
      'src/styles.css',
      ...[
        'arrow-components',
        'no-inline-styles',
        'no-raw-controls',
        'no-text-literals',
        'no-arbitrary-values',
        'theme-colors-only',
      ].flatMap((recipe) => ['--recipe', recipe]),
    ],
    file: 'src/badge.tsx',
    code: 'export const Badge = ({ label }: { label: string }) => <span className="rounded px-2 text-sm">{label}</span>;\n',
    flagged: ['react/forbid-elements', 'react/jsx-no-literals', 'tailwindcss/no-arbitrary-value', 'tailwindcss/no-default-palette'],
  },
];

const problems = SETUPS.flatMap((setup) => setupProblems(setup));
rmSync(WORK_DIR, { recursive: true, force: true });

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`${SETUPS.length} init setups checked: each writes configs that oxlint loads and a clean file passes`);

function setupProblems(setup: Setup): string[] {
  const folder = join(WORK_DIR, setup.name);
  mkdirSync(join(folder, 'src'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules'), join(folder, 'node_modules'));
  writeFileSync(join(folder, 'tsconfig.json'), JSON.stringify(TSCONFIG));
  writeFileSync(join(folder, 'src', 'styles.css'), '@import "tailwindcss";\n\n@theme {\n  --color-brand: #0055ff;\n}\n');
  writeFileSync(join(folder, setup.file), setup.code);

  const init = spawnSync(process.execPath, [INIT, '--from', REPO_ROOT, ...setup.args], { cwd: folder, encoding: 'utf8' });
  if (init.status !== 0) {
    return [`${setup.name}: init failed\n${init.stdout}${init.stderr}`];
  }

  const linted = spawnSync(OXLINT, ['--type-aware', '--deny-warnings', '-f', 'unix', 'src'], { cwd: folder, encoding: 'utf8' });
  if (linted.status !== 0) {
    return [`${setup.name}: oxlint failed on the clean file\n${linted.stdout}${linted.stderr}`];
  }
  if (setup.flagged.length === 0) {
    return [];
  }

  writeFileSync(join(folder, 'src', 'recipes.tsx'), RECIPE_CODE);
  const recipes = spawnSync(OXLINT, ['--type-aware', '-f', 'unix', 'src/recipes.tsx'], { cwd: folder, encoding: 'utf8' });
  const reported = new Set(Array.from(recipes.stdout.matchAll(DIAGNOSTIC_RULE), ([, plugin = '', name]) => `${plugin}/${name}`));

  return setup.flagged.filter((rule) => !reported.has(rule)).map((rule) => `${setup.name}: a recipe should turn on ${rule}`);
}
