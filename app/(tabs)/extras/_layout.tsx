import { Stack } from "expo-router";

export default function ExtrasLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" options={{ headerShown: false }} />
		</Stack>
	);
}
