#!/bin/bash
set -e

sh scripts/origin.sh

# eas build:list -p ios --limit=1 --distribution=internal --non-interactive --json

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."
git switch dev
git commit -a -m "auto-commit: building development | $commit_notes"
git push

echo "Patching gitignore..."
node scripts/patch_gitignore.js

eas build -p ios --profile development --local

echo "Restoring gitignore..."
node scripts/unpatch_gitignore.js

# echo "Fixing buildname..."
# node scripts/fix_buildname.js dev_build

# echo "Removing old build..."
# rm builds/dev/Illusi.app

# echo "Extracting build..."
# tar -xvf build-17.tar.gz -C builds/dev/

# echo "Removing compressed build..."
# rm builds/dev_build.tar.gz