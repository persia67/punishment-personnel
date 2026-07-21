const fs = require('fs');

let lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');

// We want to delete lines 32 to 51 (inclusive).
// BUT let's be safe and match the exact lines.

let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  if (i === 31 && lines[i].includes('const [localUser, setLocalUser] = useState<User | null>(null);')) {
    skip = true;
  }
  if (skip && lines[i].includes('const setUser = setLocalUser;')) {
    skip = false;
    continue; // skip this line too
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('App.tsx', newLines.join('\n'));
