const fs = require('fs');
const path = '.gitignore';
fs.writeFileSync(
    path, 
    fs.readFileSync(path).toString('utf-8')
        .replace('# lib-origin/', 'lib-origin/')
);