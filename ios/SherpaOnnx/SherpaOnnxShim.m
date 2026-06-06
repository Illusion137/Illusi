// Intentionally trivial. Its only job is to give the SherpaOnnx pod a
// compilable source file so CocoaPods builds it as a static library and emits
// the `SherpaOnnx` Clang module map (umbrella header -> c-api.h). Without a
// buildable source, CocoaPods skips module-map generation and `import
// SherpaOnnx` fails to resolve in PiperEngine/SherpaOnnxAPI.swift.
#import "c-api.h"
