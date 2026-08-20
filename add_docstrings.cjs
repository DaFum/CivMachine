const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const insertions = [];

  function visit(node) {
    if (ts.isFunctionDeclaration(node)) {
      const modifiers = node.modifiers;
      const isExported = modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

      if (isExported && node.name) {
        const funcName = node.name.text;

        const leadingRanges = ts.getLeadingCommentRanges(content, node.pos);

        let hasJSDoc = false;
        if (leadingRanges) {
          const lastRange = leadingRanges[leadingRanges.length - 1];
          const commentText = content.substring(lastRange.pos, lastRange.end);
          if (commentText.startsWith('/**')) {
            // Verify there is only whitespace between comment and declaration
            const spaceBetween = content.substring(lastRange.end, node.getStart());
            if (spaceBetween.trim() === '') {
              hasJSDoc = true;
            }
          }
        }

        if (!hasJSDoc) {
          insertions.push({
            pos: node.getStart(),
            text: `/**\n * Placeholder docstring for ${funcName}.\n */\n`
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (insertions.length > 0) {
    // Sort insertions in reverse order to not mess up previous positions
    insertions.sort((a, b) => b.pos - a.pos);

    let result = content;
    for (const insertion of insertions) {
      result = result.substring(0, insertion.pos) + insertion.text + result.substring(insertion.pos);
    }

    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`Added docstrings to ${filePath}`);
    return true;
  }
  return false;
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
