import { Stack } from "expo-router";

export default function ExtrasLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "Extras", headerShown: false }} />
			<Stack.Screen name="backpack" options={{ title: "Backpack", headerShown: true }} />
			<Stack.Screen name="batch-downloader" options={{ title: "Batch Downloader", headerShown: true }} />
			<Stack.Screen name="changelog" options={{ title: "Changelog", headerShown: true }} />
			<Stack.Screen name="dev-test-screen" options={{ title: "DevTestEnv", headerShown: true }} />
			<Stack.Screen name="dev" options={{ title: "Dev", headerShown: true }} />
			<Stack.Screen name="discord" options={{ title: "Discord", headerShown: true }} />
			<Stack.Screen name="external-services" options={{ title: "External Services", headerShown: true }} />
			<Stack.Screen name="help" options={{ title: "Help", headerShown: true }} />
			<Stack.Screen name="keep-delete" options={{ title: "Keep Delete", headerShown: true }} />
			<Stack.Screen name="linker" options={{ title: "Linker", headerShown: true }} />
			<Stack.Screen name="playlist-converter" options={{ title: "Playlist Converter", headerShown: true }} />
			<Stack.Screen name="recovery" options={{ title: "Recovery", headerShown: true }} />
			<Stack.Screen name="sleep-timer" options={{ title: "Sleep Timer", headerShown: true }} />
			<Stack.Screen name="statistics" options={{ title: "Statistics", headerShown: true }} />
			<Stack.Screen name="themes" options={{ title: "Themes", headerShown: true }} />
			<Stack.Screen name="settings/index" options={{ title: "Settings", headerShown: true }} />
			<Stack.Screen name="settings/experimental" options={{ title: "Experimental Settings", headerShown: true }} />
			<Stack.Screen name="settings/danger" options={{ title: "Danger", headerShown: true }} />
			<Stack.Screen name="(shared)/add-to-playlists/[track]" options={{title: "Add To Playlist", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/artist/[uri]" options={{title: "Artist", headerShown: false}}/>
            <Stack.Screen name="(shared)/playlist/[uri]" options={{title: "Playlist", headerShown: false}}/>
            <Stack.Screen name="(shared)/track-edit/[uid]" options={{title: "Edit Track", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/track-info/[uid]" options={{title: "Track Info", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/track-trim/[uid]" options={{title: "Trim Track", presentation: "modal", headerShown: false}}/>
			<Stack.Screen name="(shared)/player/equalizer-selector" options={{title: "Equalizer Presets", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/player/lyrics-share" options={{title: "Share Lyrics", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/player/lyrics" options={{title: "Lyrics", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/player/queue" options={{title: "Queue", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/player/settings" options={{title: "Settings", presentation: "modal", headerShown: false}}/>
            <Stack.Screen name="(shared)/player/visualizer" options={{title: "Visualizer", presentation: "modal", headerShown: false}}/>
			<Stack.Screen name="(shared)/album_grid" options={{title: "Albums", headerShown: false}}/>
            <Stack.Screen name="(shared)/artist_grid" options={{title: "Artists", headerShown: false}}/>
		</Stack>
	);
}
