import { writeFileSync } from 'node:fs';
import { expectedReadme, README_PATH, readRuleDocs } from './rules.ts';

const docs = readRuleDocs();

writeFileSync(README_PATH, expectedReadme(docs));
console.log(`README.md lists ${docs.length} rules`);
