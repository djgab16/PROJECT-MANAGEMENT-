const fs = require('fs');
const path = require('path');

const directory = './src';

const replacements = [
  { regex: /background:\s*white;?/gi, replacement: 'background: var(--bg-card);' },
  { regex: /background-color:\s*white;?/gi, replacement: 'background-color: var(--bg-card);' },
  { regex: /background:\s*#FFFFFF;?/gi, replacement: 'background: var(--bg-card);' },
  { regex: /background:\s*#E9EDF7;?/gi, replacement: 'background: var(--bg-main);' },
  { regex: /border:\s*1px solid #E9EDF7;?/gi, replacement: 'border: 1px solid var(--border);' },
  { regex: /border-top:\s*1px solid #E9EDF7;?/gi, replacement: 'border-top: 1px solid var(--border);' },
  { regex: /border-bottom:\s*1px solid #E9EDF7;?/gi, replacement: 'border-bottom: 1px solid var(--border);' },
  { regex: /--text-main/g, replacement: '--text-primary' },
  { regex: /background:\s*#FFF0E6;?/gi, replacement: 'background: var(--status-pending-bg);' },
  { regex: /background:\s*#FFF1F1;?/gi, replacement: 'background: var(--status-failed-bg);' },
  { regex: /color:\s*#1e293b;?/gi, replacement: 'color: var(--text-primary);' },
  { regex: /color:\s*#64748b;?/gi, replacement: 'color: var(--text-muted);' },
  { regex: /color:\s*#475569;?/gi, replacement: 'color: var(--text-secondary);' }
];

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  });
}

walkDir(directory);
console.log('Done CSS fix sweep.');
