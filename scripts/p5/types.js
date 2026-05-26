#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const P5_SOURCE = process.env.P5_SOURCE_DIR || '/tmp/p5.js';
const outputDir = 'assets/types';
const outputFile = path.join(outputDir, 'p5.d.ts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  console.log(`📖 Reading p5.js types from ${P5_SOURCE}/types/...`);

  const p5TypesPath = path.join(P5_SOURCE, 'types', 'p5.d.ts');
  const globalTypesPath = path.join(P5_SOURCE, 'types', 'global.d.ts');

  if (!fs.existsSync(p5TypesPath)) {
    console.error(`❌ p5.d.ts not found at ${p5TypesPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(globalTypesPath)) {
    console.error(`❌ global.d.ts not found at ${globalTypesPath}`);
    process.exit(1);
  }

  let p5Content = fs.readFileSync(p5TypesPath, 'utf8');
  let globalContent = fs.readFileSync(globalTypesPath, 'utf8');

  console.log('🔧 Processing instance types...');
  p5Content = p5Content
    .replace(/^\/\/ This file is auto-generated from JSDoc documentation\n?/, '')
    .replace(/export\s+default\s+p5\s*;\s*$/, '');

  console.log('🔧 Processing global types...');
  globalContent = globalContent
    .replace(/^\/\/ This file is auto-generated from JSDoc documentation\n?/, '')
    .replace(/import\s+P5\s+from\s+['"]\.\/p5['"]\s*;\s*/, '')
    .replace(/typeof\s+P5\.([a-zA-Z_]\w*)/g, 'typeof $1')
    .replace(/(?<=:\s*)P5(?=\s*[;|\n])/g, 'p5');

  const combinedContent = `// Generated p5.js Type Definitions
// Bundled from p5.js v2+ official type definitions
// Generated: ${new Date().toISOString()}

${p5Content}

${globalContent}

export as namespace p5;
export = p5;
`;

  fs.writeFileSync(outputFile, combinedContent);

  const stats = fs.statSync(outputFile);
  console.log(`✅ Type bundling complete! (${stats.size} bytes)`);
  console.log(`📁 ${outputFile}`);

} catch (error) {
  console.error('❌ Error bundling types:', error.message);
  process.exit(1);
}
