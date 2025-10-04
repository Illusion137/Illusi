import { Prefs } from "@illusive/prefs";
import { Stack } from "expo-router";
import { Button } from "react-native";

export default function PlaylistsLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="playlist" options={{ headerShown: false }} />
			<Stack.Screen name="add-to-playlist" options={{ headerShown: false }} />
			<Stack.Screen name="edit" options={{ headerShown: false }} />
			<Stack.Screen name="import/[service_name]" options={() => ({
				headerShown: true,
				headerBackTitle: "Back",
				headerStyle: { backgroundColor: Prefs.dark_theme.colors.background, }, headerTitleStyle: { fontWeight: '500', color: '#FFFFFF' }, headerTintColor: Prefs.dark_theme.colors.primary,
				headerRight: () => (<Button color='#808080' onPress={() => { }} title="Next" />),
			})} />
			<Stack.Screen name="create" options={{ headerShown: false, presentation: "modal" }} />
			<Stack.Screen name="archived" options={{ headerShown: false, presentation: "modal" }} />
		</Stack>
	);
}
