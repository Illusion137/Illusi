#!/bin/bash
set -e

sh scripts/build_pull_origin.sh

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."
git switch dev
git commit -a -m "auto-commit: building simulator | $commit_notes"
git push

echo "Patching gitignore..."
node scripts/patch_gitignore.js

eas build -p ios --profile simulator --local

echo "Restoring gitignore..."
node scripts/unpatch_gitignore.js

echo "Fixing buildname..."
node scripts/fix_buildname.js sim_build

echo "Removing old build..."
rm builds/sim/Illusi.app

echo "Extracting build..."
tar -xvf build-17.tar.gz -C builds/sim/

echo "Removing compressed build..."
rm builds/sim_build.tar.gz