#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting p5 documentation bundling... 📚✨');

const outputDir = 'doc';
const assetsDir = 'assets';
const typesFile = path.join(assetsDir, 'types', 'p5.d.ts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function extractDocumentation() {
  console.log('📖 Reading TypeScript definitions...');
  
  if (!fs.existsSync(typesFile)) {
    console.error('❌ TypeScript definitions file not found:', typesFile);
    process.exit(1);
  }
  
  const content = fs.readFileSync(typesFile, 'utf8');
  
  // Extract function documentation
  const functionDocs = [];
  const functionRegex = /\/\*\*\s*\n\s*\*\s*(.+?)\n\s*\*\s*@param\s+(\w+)\s+(.+?)\n(?:\s*\*\s*@return\s+(.+?)\n)?\s*\*\/\s*\n\s*(\w+)\s*\([^)]*\)\s*[:;]/gs;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const [, description, paramName, paramDesc, returnDesc, functionName] = match;
    functionDocs.push({
      name: functionName,
      description: description.trim(),
      params: [{ name: paramName, description: paramDesc.trim() }],
      returns: returnDesc ? returnDesc.trim() : 'void'
    });
  }
  
  // Generate documentation files
  console.log('📝 Generating documentation files...');
  
  // Main functions documentation
  const mainDoc = `# p5.js Functions Documentation

Generated from p5.js TypeScript definitions.

## Functions

${functionDocs.map(func => `
### ${func.name}

${func.description}

**Parameters:**
${func.params.map(p => `- \`${p.name}\`: ${p.description}`).join('\n')}

**Returns:** ${func.returns}
`).join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'p5-functions.txt'), mainDoc);
  
  // Generate individual function files
  functionDocs.forEach(func => {
    const funcDoc = `${func.name}()

${func.description}

Parameters:
${func.params.map(p => `  ${p.name}: ${p.description}`).join('\n')}

Returns: ${func.returns}
`;
    fs.writeFileSync(path.join(outputDir, `p5-${func.name}.txt`), funcDoc);
  });
  
  console.log(`✅ Generated ${functionDocs.length} function documentation files`);
}

try {
  extractDocumentation();
  console.log('🎉 Documentation bundling complete! 📚🎉');
} catch (error) {
  console.error('❌ Error bundling documentation:', error.message);
  process.exit(1);
}