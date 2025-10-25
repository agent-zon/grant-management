#!/usr/bin/env node
/**
 * Ensure the first tag is "Service Operations" if present, so Scalar shows it first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) process.exit(0);

for (const file of fs.readdirSync(docsDir)) {
  if (!file.endsWith('.openapi3.json')) continue;
  const p = path.join(docsDir, file);
  try {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(json.tags)) {
      const idx = json.tags.findIndex(t => (t && (t.name === 'Service Operations' || t.name === 'Batch Requests')));
      if (idx > 0) {
        const [tag] = json.tags.splice(idx, 1);
        json.tags.unshift(tag);
        fs.writeFileSync(p, JSON.stringify(json, null, 2));
        console.log(`Reordered tags in ${file}`);
      }
    }
  } catch (e) {
    console.error(`Failed processing ${file}:`, e.message);
  }
}
