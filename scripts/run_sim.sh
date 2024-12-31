#!/bin/bash
# List devices
# xcrun simctl list

set -e

sh scripts/origin.sh

device_id=7430DC59-24B7-461E-BC10-8D476C38EEFF
bundle_id=com.illusion137.Illusi
build_path="builds/sim/Illusi.app"

/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator -CurrentDeviceUDID $device_id &

read wait

xcrun simctl install $device_id $build_path
xcrun simctl launch $device_id $bundle_id

npx expo start