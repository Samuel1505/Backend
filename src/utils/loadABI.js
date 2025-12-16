import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const utilsDir = dirname(currentFile);
const srcDir = dirname(utilsDir);

export function loadABI(abiFileName) {
  const abiPath = join(srcDir, 'abis', abiFileName);
  return JSON.parse(readFileSync(abiPath, 'utf8'));
}

