const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function collect(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collect(target));
    else if (entry.name.endsWith('.js')) files.push(target);
  }
  return files;
}

const files = [
  ...collect(path.join(__dirname, '..', 'src')),
  ...collect(path.join(__dirname, '..', 'scripts')),
  ...collect(path.join(__dirname, '..', 'tests'))
];

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Lint de sintaxis completado: ${files.length} archivos`);
