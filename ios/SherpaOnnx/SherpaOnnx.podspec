#
# Local pod that makes the Piper TTS engine in react-native-mr-lecture usable:
#
#   * vendors the prebuilt sherpa-onnx + onnxruntime static xcframeworks
#   * exposes the C API (c-api.h) as a Clang module named `SherpaOnnx`, so the
#     Swift wrapper baked into react-native-mr-lecture can `import SherpaOnnx`
#     and `#if canImport(SherpaOnnx)` resolves true
#   * ships the bundled Piper voice model as the `PiperModels` resource bundle,
#     which PiperEngine auto-loads at runtime
#
# The binaries (vendor/, model/, c-api.h) are gitignored and fetched by
# scripts/fetch-piper.sh — run it before `pod install`.
#
Pod::Spec.new do |s|
  s.name         = "SherpaOnnx"
  s.version      = "1.13.2"
  s.summary      = "Vendored sherpa-onnx framework + Piper voice model for react-native-mr-lecture"
  s.homepage     = "https://github.com/k2-fsa/sherpa-onnx"
  s.license      = { :type => "Apache-2.0" }
  s.authors      = "k2-fsa"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :path => "." }

  # c-api.h is the module's public header. SherpaOnnxShim.m is a trivial
  # compilable source whose only purpose is to make the pod "buildable" so
  # CocoaPods emits a static lib + the `SherpaOnnx` umbrella Clang module
  # (umbrella header -> c-api.h). A header-only pod is skipped by CocoaPods'
  # module-map generation, which would leave `import SherpaOnnx` unresolved.
  s.source_files        = "c-api.h", "SherpaOnnxShim.m"
  s.public_header_files  = "c-api.h"

  s.vendored_frameworks  = "vendor/sherpa-onnx.xcframework", "vendor/onnxruntime.xcframework"
  s.resource_bundles     = { "PiperModels" => ["model"] }

  # sherpa-onnx is C++; pull in libc++ and Accelerate (onnxruntime CPU provider).
  s.libraries  = "c++"
  s.frameworks = "Accelerate"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE"      => "YES",
    "CLANG_ENABLE_MODULES" => "YES",
  }
end
