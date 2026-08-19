const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const functionRegex = /export\s+function\s+([a-zA-Z0-xyz_0-9]+)\s*\(/g;

  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1];
    const startIndex = match.index;

    const codeBefore = content.substring(0, startIndex);
    const lastCommentIndex = codeBefore.lastIndexOf('/**');

    let hasComment = false;
    if (lastCommentIndex !== -1) {
        const afterComment = codeBefore.substring(codeBefore.lastIndexOf('*/') + 2);
        if (afterComment.trim() === '') {
            hasComment = true;
        }
    }

    result += content.substring(lastIndex, startIndex);

    if (!hasComment) {
      result += `/**\n * Placeholder docstring for ${funcName}.\n */\n`;
      changed = true;
    }

    lastIndex = startIndex;
  }

  result += content.substring(lastIndex);

  if (changed) {
    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`Added docstrings to ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('.generated.')) {
      processFile(fullPath);
    }
  }
}

walkDir('public/game/src');
