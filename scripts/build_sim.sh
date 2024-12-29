#!/bin/bash
echo "Pulling from origin"
origin.out

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."
git switch dev
git commit -a -m "auto-commit: building simulator | $commit_notes"
git push

echo "Patching gitignore"
node scripts/patch_gitignore.js

eas build -p ios --profile simulator --local

echo "Restoring gitignore"
node scripts/unpatch_gitignore.js