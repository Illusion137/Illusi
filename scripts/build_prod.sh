#!/bin/bash
set -e

sh scripts/origin.sh

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."
commit=`echo|cat app.config.ts | grep -o '"version": "[^"]*' | grep -o '[^"]*$'`
git switch dev
git commit -a -m "Illusi $commit | auto-commit: building production | $commit_notes"
git push

echo "Patching gitignore..."
node scripts/patch_gitignore.js

eas build -p ios --local

echo "Restoring gitignore..."
node scripts/unpatch_gitignore.js

# eas submit -p ios

# echo "Fixing buildname..."
# node scripts/fix_buildname.js prod_build

# echo "Removing old build..."
# rm builds/prod/Illusi.app

# echo "Extracting build..."
# tar -xvf build-17.tar.gz -C builds/prod/

# echo "Removing compressed build..."
# rm builds/prod_build.tar.gz