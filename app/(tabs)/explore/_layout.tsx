import { Stack } from "expo-router";

export default function ExploreLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" options={{ title: "Explore", headerShown: false }} />
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
		</Stack>
	);
}
