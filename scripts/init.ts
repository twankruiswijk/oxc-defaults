import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

interface Recipe {
  needs: 'react' | 'tailwind' | undefined;
  description: string;
  rules: Record<string, unknown>;
}

interface Options {
  version: string;
  from: string | undefined;
  react: boolean;
  strict: boolean;
  tailwind: string | undefined;
  recipes: string[];
  force: boolean;
}

const RAW_URL = 'https://raw.githubusercontent.com/twankruiswijk/oxc-defaults';
const PRESET_DIR = 'oxc';
const SCHEMA = './node_modules/oxlint/configuration_schema.json';
const RECIPES = new Map<string, Recipe>([
  [
    'arrow-components',
    {
      needs: 'react',
      description: 'Components are arrow functions instead of function declarations.',
      rules: {
        'react/function-component-definition': ['error', { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' }],
      },
    },
  ],
  [
    'no-inline-styles',
    {
      needs: 'react',
      description: 'No style prop on DOM elements, so styling goes through classes and tokens.',
      rules: { 'react/forbid-dom-props': ['error', { forbid: ['style'] }] },
    },
  ],
  [
    'no-raw-controls',
    {
      needs: 'react',
      description: 'No raw <button> and <input>, so apps use the design-system components.',
      rules: {
        'react/forbid-elements': [
          'error',
          {
            forbid: [
              { element: 'button', message: 'use the design-system Button' },
              { element: 'input', message: 'use the design-system Input' },
            ],
          },
        ],
      },
    },
  ],
  [
    'no-text-literals',
    {
      needs: 'react',
      description: 'No hardcoded text in JSX, so every string goes through translations.',
      rules: { 'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }] },
    },
  ],
  [
    'no-arbitrary-values',
    {
      needs: 'tailwind',
      description: 'No arbitrary Tailwind values such as w-[13px]; every value comes from the theme.',
      rules: { 'tailwindcss/no-arbitrary-value': 'error' },
    },
  ],
  [
    'theme-colors-only',
    {
      needs: 'tailwind',
      description: "No colors from Tailwind's default palette; only the colors your theme defines.",
      rules: { 'tailwindcss/no-default-palette': 'error' },
    },
  ],
]);

const options = readOptions();

const presets = [
  'base.json',
  ...(options.react ? ['react.json'] : []),
  ...(options.tailwind === undefined ? [] : ['tailwind.json']),
  ...(options.strict ? ['strict.json'] : []),
];

await Promise.all(presets.map(async (preset) => install(join(PRESET_DIR, preset), preset)));
await Promise.all(localPlugins(join(PRESET_DIR, 'base.json')).map(async (plugin) => install(join(PRESET_DIR, plugin), plugin)));

writeConfig('.oxlintrc.json', lintConfig(presets));
writeConfig('.oxfmtrc.json', formatConfig(await download('.oxfmtrc.json')));
printNextSteps();

function readOptions(): Options {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      from: { type: 'string' },
      react: { type: 'boolean', default: false },
      strict: { type: 'boolean', default: false },
      tailwind: { type: 'string' },
      recipe: { type: 'string', multiple: true, default: [] },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(usage());
    process.exit(0);
  }

  if (values.version === undefined && values.from === undefined) {
    fail('Pass --version with a release tag, such as --version v1.1.0.');
  }

  const chosen: Options = {
    version: values.version ?? 'local',
    from: values.from,
    react: values.react,
    strict: values.strict,
    tailwind: values.tailwind,
    recipes: values.recipe,
    force: values.force,
  };
  checkRecipes(chosen);

  return chosen;
}

function checkRecipes(chosen: Options): void {
  for (const name of chosen.recipes) {
    const recipe = RECIPES.get(name);
    if (recipe === undefined) {
      fail(`Unknown recipe "${name}". Run with --help to list them.`);
    }

    const missingReact = recipe.needs === 'react' && !chosen.react;
    const missingTailwind = recipe.needs === 'tailwind' && chosen.tailwind === undefined;
    if (missingReact || missingTailwind) {
      fail(`The ${name} recipe needs --${recipe.needs}.`);
    }
  }
}

async function install(target: string, path: string): Promise<void> {
  mkdirSync(dirname(target), { recursive: true });
  if (options.from === undefined) {
    writeFileSync(target, await download(path));
  } else {
    copyFileSync(join(options.from, path), target);
  }

  console.log(`wrote ${target}`);
}

async function download(path: string): Promise<string> {
  if (options.from !== undefined) {
    return readFileSync(join(options.from, path), 'utf8');
  }

  const response = await fetch(`${RAW_URL}/${options.version}/${path}`);
  if (!response.ok) {
    fail(`Could not download ${path} for ${options.version}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function localPlugins(presetPath: string): string[] {
  const parsed: unknown = JSON.parse(readFileSync(presetPath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || !('jsPlugins' in parsed) || !Array.isArray(parsed.jsPlugins)) {
    return [];
  }

  return parsed.jsPlugins.filter((plugin): plugin is string => typeof plugin === 'string' && plugin.startsWith('./'));
}

function lintConfig(presetFiles: readonly string[]): object {
  const rules = Object.fromEntries(options.recipes.flatMap((name) => Object.entries(RECIPES.get(name)?.rules ?? {})));
  const settings = options.tailwind === undefined ? undefined : { tailwindcss: { entryPoint: options.tailwind } };

  return {
    $schema: SCHEMA,
    extends: presetFiles.map((preset) => `./${PRESET_DIR}/${preset}`),
    ...(settings === undefined ? {} : { settings }),
    rules,
  };
}

function formatConfig(shared: string): object {
  const parsed: unknown = JSON.parse(shared);
  if (typeof parsed !== 'object' || parsed === null) {
    fail('.oxfmtrc.json in oxc-defaults is not an object.');
  }
  if (options.tailwind === undefined) {
    return parsed;
  }

  return { ...parsed, sortTailwindcss: { stylesheet: options.tailwind } };
}

function writeConfig(path: string, config: object): void {
  if (existsSync(path) && !options.force) {
    console.log(`kept ${path}, it already exists (pass --force to replace it)`);

    return;
  }

  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`wrote ${path}`);
}

function printNextSteps(): void {
  const packages = ['oxlint', 'oxlint-tsgolint', 'oxfmt', ...(options.tailwind === undefined ? [] : ['oxlint-tailwindcss'])];

  console.log(`
Next:
  pnpm add -D ${packages.join(' ')}

and add these scripts to package.json, with your source folder in place of src:
  "lint": "oxlint --type-aware --deny-warnings src",
  "fmt": "oxfmt src",
  "fmt:check": "oxfmt --check src"`);
}

function usage(): string {
  const recipes = [...RECIPES].map(([name, recipe]) => `  ${name.padEnd(20)} ${recipe.description}`);

  return [
    'Usage: node init.ts --version <tag> [--react] [--strict] [--tailwind <stylesheet>] [--recipe <name>]... [--force]',
    '',
    'Downloads the presets into oxc/ and writes .oxlintrc.json and .oxfmtrc.json.',
    'Existing root configs are kept unless you pass --force; oxc/ is always replaced.',
    '',
    'Recipes, project choices written into your own .oxlintrc.json:',
    ...recipes,
  ].join('\n');
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
