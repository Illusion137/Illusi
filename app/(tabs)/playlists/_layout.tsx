import { Prefs } from "@illusive/prefs";
import { Stack } from "expo-router";
import { Button } from "react-native";

export default function PlaylistsLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "Playlists", headerShown: false }} />
			<Stack.Screen name="add-to-playlist" options={{ title: "Add To Playlist", headerShown: false }} />
			<Stack.Screen name="edit" options={{ title: "Edit Playlist", headerShown: true }} />
			<Stack.Screen name="edit-sort" options={{ title: "Edit Playlist Sorting", headerShown: true }} />
			<Stack.Screen
				name="import/[service_name]"
				options={() => ({
					title: "Import",
					headerShown: true,
					headerBackTitle: "Back",
					headerStyle: { backgroundColor: Prefs.dark_theme.colors.background },
					headerTitleStyle: { fontWeight: "500", color: "#FFFFFF" },
					headerTintColor: Prefs.dark_theme.colors.primary,
					headerRight: () => (
						<Button
							color="#808080"
							onPress={() => {
								return;
							}}
							title="Next"
						/>
					)
				})}
			/>
			<Stack.Screen name="create" options={{ title: "Create Playlist", headerShown: false, presentation: "modal" }} />
			<Stack.Screen name="archived" options={{ title: "Archived Playlists", headerShown: false, presentation: "modal", sheetAllowedDetents: [1.0], sheetCornerRadius: 0 }} />
			<Stack.Screen name="(shared)/add-to-playlists/[track]" options={{ title: "Add To Playlist", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/artist/[uri]" options={{ title: "Artist", headerShown: false }} />
			<Stack.Screen name="(shared)/playlist/[uri]" options={{ title: "Playlist", headerShown: false }} />
			<Stack.Screen name="(shared)/track-edit/[uid]" options={{ title: "Edit Track", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/track-info/[uid]" options={{ title: "Track Info", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/track-trim/[uid]" options={{ title: "Trim Track", presentation: "formSheet", sheetAllowedDetents: [0.6], headerShown: false }} />
			<Stack.Screen name="(shared)/player/lyrics" options={{ title: "Lyrics", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/player/queue" options={{ title: "Queue", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/player/settings" options={{ title: "Settings", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/player/visualizer" options={{ title: "Visualizer", presentation: "modal", headerShown: false }} />
			<Stack.Screen name="(shared)/album_grid" options={{ title: "Albums", headerShown: false }} />
			<Stack.Screen name="(shared)/artist_grid" options={{ title: "Artists", headerShown: false }} />
		</Stack>
	);
}
