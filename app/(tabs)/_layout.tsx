import { Entypo, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import type { BottomAlertType, PlayingState, Track } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { filter_play_tracks } from "@illusive/illusi/src/play";
import { playback_service } from "@illusive/track_player_service";
import BottomAlert from "@components/BottomAlert";
import appConfig from "app.config";
import TrackPlayer from "react-native-track-player";
import type { ConfigContext } from "expo/config";
import { ThemeProvider } from "@react-navigation/native";
import { get_shortcut_subscription, on_app_load } from "@illusive/startup";
import { reinterpret_cast } from "@common/cast";
import { gen_uuid } from "@common/utils/util";
import AudioPlayer from "@screens/other/AudioPlayer";
import { GLOBALS } from "@illusive/globals";
import { load_illusi_icons } from "@utils/load_illusi_icons";
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import * as Sentry from "@sentry/react-native";
import IImage from "@components/IImage";

type ScreenColor = { color: string };

const splash_screen_image = require("../../assets/splash.png");

TrackPlayer.registerPlaybackService(() => playback_service);

//TODO use Sentry.wrap(
export default function App() {
	const [theme, set_theme] = useState<Prefs.Theme>(Prefs.get_theme(Prefs.get_pref("theme")));
	const [playing_tracks, set_playing_tracks] = useState<Track[]>([]);
	const [playing_from, set_playing_from] = useState("");
	const [is_playing, set_is_playing] = useState<PlayingState>("OFF");
	const [is_loading, set_is_loading] = useState(true);
	const [bottom_alert, set_bottom_alert] = useState({
		uuid: "",
		text: "",
		type: "GOOD" as BottomAlertType
	});

	useEffect(() => {
		const shortcut_subscription = get_shortcut_subscription(play_tracks);
		load_illusi_icons();
		on_app_load(appConfig(reinterpret_cast<ConfigContext['config']>({})).version!, play_tracks, set_is_loading, set_theme, update_bottom_alert);
		// migrate(0 as never, {});
		return () => shortcut_subscription.remove();
	}, []);
	useEffect(() => {
		if (is_playing !== "LOADING") return;
		set_is_playing("ON");
		GLOBALS.global_var.is_playing = true;
	}, [is_playing]);

	async function play_tracks(start_track: Track, tracks: Track[], title: string) {
		tracks = await filter_play_tracks(start_track, tracks, title);
		if (tracks.length === 0) return;
		set_playing_tracks(tracks);
		set_playing_from(title);
		set_is_playing("LOADING");
	}
	function update_bottom_alert(text: string, type: BottomAlertType) {
		set_bottom_alert({
			uuid: gen_uuid(),
			text,
			type
		});
	}

	return (
		<ThemeProvider value={{...theme, fonts: {
				regular: {fontFamily: "", fontWeight: '400'},
				medium: {fontFamily: "", fontWeight: '600'},
				heavy: {fontFamily: "", fontWeight: 'bold'},
				bold: {fontFamily: "", fontWeight: 'bold'}}
			}}>
			{is_loading ? <IImage style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%" }} source={splash_screen_image} /> : null}
			{is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
			<BottomAlert type={bottom_alert.type} text={bottom_alert.text} uuid={bottom_alert.uuid} />
			{!is_loading ? (
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarActiveTintColor: theme.colors.primary,
						tabBarInactiveTintColor: theme.colors.tabInactive,
						tabBarActiveBackgroundColor: theme.colors.background,
						tabBarInactiveBackgroundColor: theme.colors.background
					}}>
					<Tabs.Screen
						name="index"
						options={{
							title: "My Library",
							tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="library-sharp" size={30} color={color} />,
							freezeOnBlur: true
						}}
					/>
					<Tabs.Screen
						name="playlists"
						options={{
							title: "Playlists",
							tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="musical-notes" size={25} color={color} />,
							freezeOnBlur: true
						}}
					/>
					<Tabs.Screen
						name="explore"
						options={{
							title: "Explore",
							tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="search" size={25} color={color} />,
							freezeOnBlur: true
						}}
					/>
					<Tabs.Screen
						name="extras"
						options={{
							title: "Extras",
							tabBarIcon: ({ color }: ScreenColor) => <Entypo name="dots-three-horizontal" size={25} color={color} />,
							freezeOnBlur: true
						}}
					/>
				</Tabs>
			) : null}
		</ThemeProvider>
	);
}
