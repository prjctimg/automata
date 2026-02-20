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

// Helper function to clean JSDoc formatting
function cleanJsdocText(text) {
  if (!text) return '';
  
  // Split into lines, remove leading asterisks and whitespace, then rejoin
  const lines = text.split('\n');
  const cleanedLines = lines.map(line => {
    // Remove leading whitespace and asterisk
    let cleaned = line.replace(/^\s*\*\s?/, '');
    // Remove leading whitespace
    cleaned = cleaned.replace(/^\s+/, '');
    return cleaned;
  });
  
  // Join and normalize whitespace
  let result = cleanedLines.join(' ');
  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ');
  // Clean up multiple periods
  result = result.replace(/\.\s*\./g, '.');
  
  return result.trim();
}

// Helper function to wrap text to specified length
function wrapText(text, maxLength = 78) {
  if (!text || text.length <= maxLength) return text;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.join('\n');
}

// Module emojis mapping
const moduleEmojis = {
  'accessibility': '♿',
  'color': '🎨',
  'core': '⚙️',
  'data': '📊',
  'dom': '🌐',
  'events': '🖱️',
  'image': '🖼️',
  'io': '📁',
  'math': '🔢',
  'typography': '📝',
  'utilities': '🛠️',
  'webgl': '🎮'
};

// Helper function to parse JSDoc block and extract metadata
function parseJsdocBlock(jsdocContent, name, subCategory) {
  // Extract description - everything before @param, @return, or @returns
  let description = '';
  const returnsMatch = jsdocContent.match(/@returns\s+/);
  const returnMatch = jsdocContent.match(/@return\s+/);
  const paramMatch = jsdocContent.match(/@param\s+/);
  
  let earliestMatch = null;
  if (paramMatch) earliestMatch = paramMatch;
  if (returnsMatch && (!earliestMatch || returnsMatch.index < earliestMatch.index)) earliestMatch = returnsMatch;
  if (returnMatch && (!earliestMatch || returnMatch.index < earliestMatch.index)) earliestMatch = returnMatch;
  
  if (earliestMatch) {
    description = jsdocContent.substring(0, earliestMatch.index).trim();
  } else {
    description = jsdocContent.trim();
  }
  
  // Clean the description
  description = cleanJsdocText(description);
  
  // Extract all params - handle multi-line descriptions
  const params = [];
  const paramRegex = /@param\s+(\w+)\s+(.+?)(?=\n\s*\*\s*@param|\n\s*\*\s*@return|\n\s*\*\s*@returns|\n\s*\*\/)/gs;
  let pMatch;
  while ((pMatch = paramRegex.exec(jsdocContent)) !== null) {
    // Clean the description (remove newlines and extra asterisks)
    let paramDesc = pMatch[2].replace(/\n\s+\*/g, ' ').trim();
    params.push({
      name: pMatch[1],
      description: cleanJsdocText(paramDesc)
    });
  }
  
  // Extract return value - handle both @return and @returns
  let returns = 'void';
  const returnsContentMatch = jsdocContent.match(/@returns\s+(.+?)(?=\n\s*\*\s*@|\n\s*\*\/)/);
  const returnContentMatch = jsdocContent.match(/@return\s+(.+?)(?=\n\s*\*\s*@|\n\s*\*\/)/);
  
  if (returnsContentMatch) {
    returns = cleanJsdocText(returnsContentMatch[1]);
  } else if (returnContentMatch) {
    returns = cleanJsdocText(returnContentMatch[1]);
  }
  
  return {
    name: name,
    description: description,
    params: params,
    returns: returns,
    subModule: subCategory
  };
}

// Helper function to create Vimdoc format with emojis
function createVimdocContent(moduleName, functions, p5Version, timestamp) {
  const emoji = moduleEmojis[moduleName] || '📚';
  
  // Create table of contents - simple flat list
  const tocFunctions = functions.map(func => 
    `  - ${func.name}()              |p5-${moduleName}-${func.name}|`
  ).join('\n');

  // Create function documentation with proper structure
  const functionDocs = functions.map(func => {
    // Clean description
    const cleanDesc = func.description || '';
    const wrappedDesc = wrapText(cleanDesc);
    
    // Only show params section if there are params
    let paramsSection = '';
    if (func.params && func.params.length > 0) {
      const paramsList = func.params.map(p => {
        const cleanParamDesc = p.description || '';
        return `    ${p.name}  ${cleanParamDesc}`;
      }).join('\n');
      paramsSection = `
#### Parameters:

${paramsList}
`;
    }
    
    // Clean return
    const cleanReturn = func.returns || 'void';
    
    return `
\`${func.name}()\`                                            |p5-${moduleName}-${func.name}|

${wrappedDesc}
${paramsSection}
#### Returns:

    ${cleanReturn}

📂 *Sub-module: ${func.subModule || 'main'}*

---
`;
  }).join('\n');

  return `*p5-${moduleName}*                                         p5.js ${moduleName} docs

==============================================================================
Table of Contents                           *p5-${moduleName}-table-of-contents*

1. Functions                                                |p5-${moduleName}-functions|
${tocFunctions}

${emoji} ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} module for p5.js

📦 p5.js Version: ${p5Version}~
⏰ Last Updated: ${timestamp}~

==============================================================================
2. Functions                                                |p5-${moduleName}-functions|

${functionDocs}
==============================================================================
Generated by p5.nvim documentation generator <https://github.com/prjctimg/p5.nvim>

vim:tw=78:ts=8:ft=help:norl:
`;
}

function extractDocumentation() {
  console.log('📖 Reading TypeScript definitions...');
  
  if (!fs.existsSync(typesFile)) {
    console.error('❌ TypeScript definitions file not found:', typesFile);
    process.exit(1);
  }
  
  const content = fs.readFileSync(typesFile, 'utf8');
  
  // Get p5 version and timestamp
  const p5Version = '1.7.7';
  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+/, '');
  
  // Extract module sections and their functions
  const modules = {};
  
  // Find all inlined file references
  const moduleRegex = /\/\/ Inlined from: \.\/src\/([^\/]+)\/([^\/]+)\.d\.ts\s*\n([\s\S]*?)(?=\n\/\/ Inlined from:|$)/g;
  
  let match;
  while ((match = moduleRegex.exec(content)) !== null) {
    const [, mainCategory, subCategory, moduleContent] = match;
    
    // Extract function documentation
    const functionDocs = [];
    
    // Match JSDoc comments with their function declarations
    const funcRegex = /\/\*\*([\s\S]*?)\*\/\s*\n\s*(?:export\s+)?function\s+(\w+)\s*\([^)]*\)\s*[:;]/g;
    
    let funcMatch;
    while ((funcMatch = funcRegex.exec(moduleContent)) !== null) {
      const [, jsdocContent, functionName] = funcMatch;
      const parsed = parseJsdocBlock(jsdocContent, functionName, subCategory);
      functionDocs.push(parsed);
    }
    
    // Also match method declarations (not just exported functions)
    const methodRegex = /\/\*\*([\s\S]*?)\*\/\s*\n\s*(?:export\s+)?(\w+)\s*\([^)]*\)\s*[:;]/g;
    
    let methodMatch;
    while ((methodMatch = methodRegex.exec(moduleContent)) !== null) {
      // Skip if already captured as function
      const [, jsdocContent, methodName] = methodMatch;
      if (functionDocs.some(f => f.name === methodName)) continue;
      
      const parsed = parseJsdocBlock(jsdocContent, methodName, subCategory);
      functionDocs.push(parsed);
    }
    
    // Group by main category (e.g., color, core, accessibility)
    if (functionDocs.length > 0) {
      if (!modules[mainCategory]) {
        modules[mainCategory] = [];
      }
      modules[mainCategory].push(...functionDocs);
    }
  }
  
  // Generate Vimdoc files per module
  console.log('📝 Generating Vimdoc files per module...');
  
  // Generate individual module files (one per main category)
  Object.entries(modules).forEach(([moduleName, functions]) => {
    const vimdocContent = createVimdocContent(moduleName, functions, p5Version, timestamp);
    fs.writeFileSync(path.join(outputDir, `p5-${moduleName}.txt`), vimdocContent);
  });
  
  // Generate main index file
  const indexContent = `*p5-modules*                                         p5.js modules index

==============================================================================
Table of Contents                                  *p5-modules-table-of-contents*

1. Available Modules                                      |p5-modules-available|

📚 p5.js Modules Documentation

📦 p5.js Version: ${p5Version}~
⏰ Last Updated: ${timestamp}~

==============================================================================
1. Available Modules                                      |p5-modules-available|

${Object.entries(modules).map(([moduleName, functions]) => {
  const emoji = moduleEmojis[moduleName] || '📚';
  return `- ${emoji} p5.${moduleName} - ${functions.length} functions`;
}).join('\n')}

Total: ${Object.values(modules).reduce((total, funcs) => total + funcs.length, 0)} functions across ${Object.keys(modules).length} modules

==============================================================================
Generated by p5.nvim documentation generator <https://github.com/prjctimg/p5.nvim>

vim:tw=78:ts=8:ft=help:norl:
`;

  fs.writeFileSync(path.join(outputDir, 'p5-modules.txt'), indexContent);
  
  console.log(`✅ Generated ${Object.keys(modules).length} Vimdoc module files`);
  console.log(`📊 Total functions documented: ${Object.values(modules).reduce((total, funcs) => total + funcs.length, 0)}`);
}

try {
  extractDocumentation();
  console.log('🎉 Vimdoc documentation bundling complete! 📚🎉');
} catch (error) {
  console.error('❌ Error bundling documentation:', error.message);
  process.exit(1);
}