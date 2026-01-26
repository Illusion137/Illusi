import { Stack } from "expo-router";

export default function PlayerSettingsLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="equalizer-selector" options={{ headerShown: false }} />
		</Stack>
	);
}
