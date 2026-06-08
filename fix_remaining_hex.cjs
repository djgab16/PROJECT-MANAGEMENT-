const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { regex: /background-color:\s*#F8FAFC;?/gi, replacement: 'background-color: var(--bg-main);' },
  { regex: /border:\s*4px solid #F8FAFC;?/gi, replacement: 'border: 4px solid var(--bg-main);' },
  { regex: /background:\s*#F4F7FE;?/gi, replacement: 'background: var(--bg-main);' },
  { regex: /background:\s*#f1f5f9;?/gi, replacement: 'background: var(--bg-main);' },
  { regex: /background:\s*#f8fafc;?/gi, replacement: 'background: var(--bg-main);' },
  { regex: /color:\s*#8F9BBA;?/gi, replacement: 'color: var(--text-tertiary);' },
  { regex: /color:\s*#A3AED0;?/gi, replacement: 'color: var(--text-secondary);' },
  { regex: /color:\s*#334155\s*!important;?/gi, replacement: 'color: var(--text-primary) !important;' },
  { regex: /color:\s*#1B254B;?/gi, replacement: 'color: var(--text-primary);' },
  { regex: /border-bottom:\s*1px solid #f1f5f9\s*!important;?/gi, replacement: 'border-bottom: 1px solid var(--border) !important;' },
  { regex: /background:\s*linear-gradient\(90deg, #E9EDF7, #F4F7FE\);?/gi, replacement: 'background: var(--bg-card);' },
  { regex: /background:\s*linear-gradient\(135deg, #F4F7FE 0%, #E8ECF4 100%\);?/gi, replacement: 'background: var(--bg-main);' },
  { regex: /background:\s*linear-gradient\(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%\);?/gi, replacement: 'background: var(--bg-card);' },
  { regex: /background:\s*#1B254B;?/gi, replacement: 'background: var(--primary-dark);' },
  { regex: /background:\s*#f0fdfa;?/gi, replacement: 'background: var(--status-active-bg);' },
  { regex: /background:\s*#ccfbf1;?/gi, replacement: 'background: var(--status-active-bg);' },
  { regex: /color:\s*#059669;?/gi, replacement: 'color: var(--status-active);' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.css') && !fullPath.endsWith('index.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log("Sweep complete.");
