import { Stack } from "expo-router";

export default function LibraryLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "My Library", headerShown: false }} />
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
