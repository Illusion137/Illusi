set -e
pushd ../lib-origin/
ts-node -T scripts/prebuild.ts
popd

yarn add github:Illusion137/RNTPvE
yarn prebuild
yarn ota:release
export SENTRY_PROPERTIES=ios/sentry.properties
xcodebuild -workspace ios/Illusi.xcworkspace \
           -scheme Illusi \
           -configuration Release \
           -archivePath builds/Illusi.xcarchive \
           archive
xcodebuild -exportArchive \
           -archivePath builds/Illusi.xcarchive \
           -exportOptionsPlist ios/ExportOptions.plist \
           -exportPath builds/prod/

node_modules/@sentry/cli/bin/sentry-cli debug-files upload \
  --org illusion-ke \
  --project illusi \
  builds/Illusi.xcarchive/dSYMs/
