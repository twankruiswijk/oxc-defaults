import { writeFileSync } from 'node:fs';
import { expectedReadme, README_PATH, readLintConfig, readRuleDocs } from './rules.ts';

const config = readLintConfig();
const docs = readRuleDocs(config.rules.keys());

writeFileSync(README_PATH, expectedReadme(docs));
console.log(`README.md lists ${docs.length} rules`);
