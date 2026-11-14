rm -r "app/(tabs)/explore/(shared)"
rm -r "app/(tabs)/extras/(shared)"
rm -r "app/(tabs)/playlists/(shared)"
rm -r "app/(tabs)/library/(shared)"

cp -r "screens/(shared)" "app/(tabs)/explore/(shared)"
cp -r "screens/(shared)" "app/(tabs)/extras/(shared)"
cp -r "screens/(shared)" "app/(tabs)/playlists/(shared)"
cp -r "screens/(shared)" "app/(tabs)/library/(shared)"

origin
node -e 'const fs=require("fs");fs.writeFileSync("utils/gen_changelog.ts","export const CHANGELOG = "+JSON.stringify(fs.readFileSync("lib-origin/changelog.md","utf8"))+";\n")'
