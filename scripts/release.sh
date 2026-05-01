set -e
pushd ../lib-origin/
ts-node -T scripts/prebuild.ts
popd

yarn add github:Illusion137/RNTPvE
yarn prebuild

# Re-run CocoaPods so Podfile post_install hooks (deployment target normalization) are applied
# before archiving in case dependencies were updated in this release run.
pushd ios/
pod install --silent
popd

yarn ota:release
export SENTRY_PROPERTIES=ios/sentry.properties
xcodebuild -workspace ios/Illusi.xcworkspace \
           -scheme Illusi \
           -configuration Release \
           -archivePath builds/Illusi.xcarchive \
           -allowProvisioningUpdates \
           archive
xcodebuild -exportArchive \
           -archivePath builds/Illusi.xcarchive \
           -exportOptionsPlist ios/ExportOptions.plist \
           -allowProvisioningUpdates \
           -exportPath builds/prod/

node_modules/@sentry/cli/bin/sentry-cli debug-files upload \
  --org illusion-ke \
  --project illusi \
  builds/Illusi.xcarchive/dSYMs/
