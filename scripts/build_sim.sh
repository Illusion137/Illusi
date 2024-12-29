#!/bin/bash
echo "Pulling from origin"
origin

echo "Commit Notes: "
read commit_notes
echo "Commiting to dev branch..."

echo "Patching gitignore"
node scripts/patch_gitignore.js

eas build -p ios --profile simulator --local

echo "Restoring gitignore"
node scripts/unpatch_gitignore.js