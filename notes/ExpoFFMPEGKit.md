I uploaded a zip file with the frameworks to my github because I need dynamic installing when using Expo Dev and EAS.

Quick And Simple Local Fix
Edit Your Podfile (inside ios/Podfile):

target 'YourApp' do
  # Add these lines above `pod install`:
  pod 'shaquillehinds-ffmpeg-kit-ios-https', :podspec => 'https://raw.githubusercontent.com/shaquillehinds/ffmpeg/master/shaquillehinds-ffmpeg-kit-ios-https.podspec'
  pod 'ffmpeg-kit-react-native', :path => '../node_modules/ffmpeg-kit-react-native'

  # ...other pods
end
Modify ffmpeg-kit-react-native.podspec in node_modules/ffmpeg-kit-react-native:

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = package["name"]
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform          = :ios
  s.requires_arc      = true
  s.static_framework  = true

  s.source       = { :git => "https://github.com/arthenica/ffmpeg-kit.git", :tag => "react.native.v#{s.version}" }
  s.default_subspec = 'https'
  s.dependency "React-Core"

  s.subspec 'https' do |ss|
    ss.source_files = '**/FFmpegKitReactNativeModule.m', '**/FFmpegKitReactNativeModule.h'
    ss.dependency 'shaquillehinds-ffmpeg-kit-ios-https', "6.0.2"
    ss.ios.deployment_target = '12.1'
  end
end
If using Expo Dev you can run the following BUT you need to add the config plugin to modify the Podfile. Check the last part of this comment for more instructions.
expo prebuild --clean
For bare native or without the expo config plugin.
Install Pods:

cd ios
pod install --repo-update
Clean & Rebuild if needed:

rm -rf Pods Podfile.lock
pod install --repo-update
Done — Now iOS uses your custom FFmpeg Pod (shaquillehinds-ffmpeg-kit-ios-https) via ffmpeg-kit-react-native.

(Optional Step To Persist Changes) Patching ffmpeg-kit-react-native with patch-package
Install patch-package:

npm install --save-dev patch-package
Add a Postinstall Script in your package.json:

{
  "scripts": {
    "postinstall": "patch-package"
  }
}
Edit the Package:

Go to node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec
Make your changes (e.g., pointing to custom FFmpeg Pods).
Generate the Patch:

npx patch-package ffmpeg-kit-react-native
This creates a patch file in patches/.

Commit the Patch:

Add and commit the .patch file in patches/.
Now every time you install dependencies, your changes are automatically re-applied.
[Expo] Adding a Config Plugin for Custom FFmpeg Pods
Create with-ffmpeg-pod.js at your project root:

const {
  withPlugins,
  createRunOncePlugin,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function addPodDependency(podfilePath) {
  console.warn($lf(14), "adding");
  const podInstallLine = `pod 'shaquillehinds-ffmpeg-kit-ios-https', :podspec => 'https://raw.githubusercontent.com/shaquillehinds/ffmpeg/master/shaquillehinds-ffmpeg-kit-ios-https.podspec'`;
  const podInstallLine2 = `pod 'ffmpeg-kit-react-native', :path => '../node_modules/ffmpeg-kit-react-native'`;

  let contents = fs.readFileSync(podfilePath, "utf8");
  if (!contents.includes(podInstallLine)) {
    contents = contents.replace(
      /post_install do \|installer\|/g,
      `${podInstallLine}\n\n  post_install do |installer|`
    );

    contents = contents.replace(
      /post_install do \|installer\|/g,
      `${podInstallLine2}\n\n  post_install do |installer|`
    );

    console.warn($lf(31), podInstallLine2);
    fs.writeFileSync(podfilePath, contents, "utf8");
  }
}

function withMyFFmpegPod(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      addPodDependency(podfilePath);
      return cfg;
    },
  ]);
}

const withFFmpegPod = (config) => {
  return withPlugins(config, [withMyFFmpegPod]);
};

module.exports = createRunOncePlugin(
  withFFmpegPod,
  "with-ffmpeg-pod",
  "1.0.0"
);
Reference the Plugin in your app.json:

{
  "expo": {
    "name": "MyApp",
    "plugins": [
      ["@config-plugins/ffmpeg-kit-react-native"], // This npm package should be installed
      "./with-ffmpeg-pod.js"
    ]
  }
}
(If you’re using app.config.js, add plugins: ["./with-ffmpeg-pod.js"] in the exported config.)

Prebuild and Install:
expo prebuild -p ios
cd ios
pod install
The generated Podfile will now include:
pod 'shaquillehinds-ffmpeg-kit-ios-https', :podspec => '...'
pod 'ffmpeg-kit-react-native', :path => '../node_modules/ffmpeg-kit-react-native'
That’s it! Your Expo project will automatically inject the custom Pods each time you run expo prebuild, keeping your iOS setup in sync with your custom FFmpeg binaries.