#!/bin/bash
set -e

sh scripts/origin.sh

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."
git switch dev
git commit -a -m "auto-commit: building simulator | $commit_notes"
git push

echo "Patching gitignore..."
node scripts/patch_gitignore.js

eas build -p ios --profile simulator --local --non-interactive

echo "Restoring gitignore..."
node scripts/unpatch_gitignore.js

echo "Fixing buildname..."
node scripts/fix_buildname.js sim_build

echo "Removing old build..."
rm -f builds/sim/Illusi.app

echo "Extracting build..."
tar -xvf builds/sim_build.tar.gz -C builds/sim/

echo "Removing compressed build..."
rm -f builds/sim_build.tar.gz