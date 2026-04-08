/**
 * Desktop stub for react-native-siri-shortcut
 * Provides a no-op implementation for desktop builds
 */

export const presentShortcut = async (options: any) => {
	console.log("[Siri Shortcut Stub] presentShortcut called (no-op on desktop)");
	return null;
};

export default {
	presentShortcut,
};
