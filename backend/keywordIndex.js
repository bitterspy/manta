// keywordIndex.js
// Builds a simple index mapping keyword names to where they are defined
// (which whitelisted source file + line number), so the frontend "Code"
// tab can turn keyword calls into clickable go-to-definition links, like
// an IDE. This is a lightweight line-based scan, not a real Robot
// Framework/Python parser — good enough for this project's own keywords.

const fs = require('fs');

// A Robot Framework keyword definition is a line in *** Keywords *** that
// starts at column 0 (no leading whitespace) and isn't a setting row like
// [Documentation]/[Arguments]/[Tags] or a "..." continuation line.
const ROBOT_KEYWORD_DEF = /^([A-Z][^\s].*?)\s*$/;
const ROBOT_SECTION_HEADER = /^\*\*\*\s*(\w+)/;

// A Python method definition inside the mock library, converted to the
// Title Case name Robot Framework exposes for it (snake_case -> Title Case
// With Spaces), which is how Robot Framework's dynamic API auto-generates
// keyword names from Python method names.
const PYTHON_DEF = /^\s{4}def\s+([a-z_][a-z0-9_]*)\s*\(/;

function snakeToKeywordName(snakeName) {
  return snakeName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function indexRobotKeywords(filename, content, index) {
  const lines = content.split('\n');
  let inKeywordsSection = false;

  lines.forEach((line, i) => {
    const sectionMatch = line.match(ROBOT_SECTION_HEADER);
    if (sectionMatch) {
      inKeywordsSection = sectionMatch[1].toLowerCase() === 'keywords';
      return;
    }
    if (!inKeywordsSection) return;
    if (line.startsWith(' ') || line.startsWith('\t') || line.startsWith('...')) return;
    if (line.trim() === '') return;

    const match = line.match(ROBOT_KEYWORD_DEF);
    if (match) {
      index[match[1]] = { file: filename, line: i + 1 };
    }
  });
}

function indexPythonMethods(filename, content, index) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const match = line.match(PYTHON_DEF);
    if (match && match[1] !== '__init__') {
      index[snakeToKeywordName(match[1])] = { file: filename, line: i + 1 };
    }
  });
}

function buildKeywordIndex(sourceFiles) {
  const index = {};
  for (const [filename, filePath] of Object.entries(sourceFiles)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (filename.endsWith('.robot')) {
      indexRobotKeywords(filename, content, index);
    } else if (filename.endsWith('.py')) {
      indexPythonMethods(filename, content, index);
    }
  }
  return index;
}

module.exports = { buildKeywordIndex };
