import { Stack, usePathname } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import AudioPlayer from "@screens/AudioPlayer";
import { GLOBALS } from "@illusive/globals";
import { load_illusi_icons } from "@utils/load_illusi_icons";
import * as Sentry from "@sentry/react-native";
import IImage from "@components/IImage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SharedRouter } from "@utils/shared_routes";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ResponseError } from "@common/types";
import { get_linking_handler } from "@utils/linking";
import { JSEvaluatorWebView } from "@native/jseval/jseval.mobile";
import nodejs from "nodejs-mobile-react-native";
import { initialize_sentry_severity_handler } from "../lib-origin/common/sentry_error_handler";

const splash_screen_image = require("../assets/splash.png");

TrackPlayer.registerPlaybackService(() => playback_service);

Sentry.init({
	dsn: "https://9c6195e4f85113499be07c6bc8402993@o4510064302227456.ingest.us.sentry.io/4510064306159616",

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Enable Logs
	// enableLogs: true,
	// enabled: true
	enabled: !__DEV__

	// Configure Session Replay
	// replaysSessionSampleRate: 0.1,
	// replaysOnErrorSampleRate: 1,
	// integrations: [Sentry.mobileReplayIntegration()],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

export default Sentry.wrap(function App() {
	const [theme, set_theme] = useState<Prefs.Theme>(Prefs.get_theme(Prefs.get_pref("theme")));
	const [playing_tracks, set_playing_tracks] = useState<Track[]>([]);
	const [playing_from, set_playing_from] = useState("");
	const [is_playing, set_is_playing] = useState<PlayingState>("OFF");
	const [is_loading, set_is_loading] = useState(true);
	const [bottom_alert, set_bottom_alert] = useState({
		uuid: "",
		text: "",
		type: "GOOD" as BottomAlertType,
		more_info: "" as string | ResponseError
	});

	async function play_tracks(start_track: Track, tracks: Track[], title: string) {
		tracks = await filter_play_tracks(start_track, tracks, title);
		if (tracks.length === 0) return;
		set_playing_tracks(tracks);
		set_playing_from(title);
		set_is_playing("LOADING");
	}

	useEffect(() => {
		nodejs.start("main.js");
		nodejs.channel.addListener("message", (msg) => {
			Sentry.addBreadcrumb({ message: "From node: " + msg });
		});
		initialize_sentry_severity_handler();

		const linking_handler = get_linking_handler();

		const subscription = get_shortcut_subscription(play_tracks);
		load_illusi_icons();
		(async () => {
			await on_app_load(appConfig(reinterpret_cast<ConfigContext["config"]>({})).version!, play_tracks, set_is_loading, set_theme, update_bottom_alert);
			GLOBALS.global_var.kill_audioplayer = () => {
				if (!GLOBALS.global_var.is_playing) return;
				try {
					GLOBALS.global_var.is_playing = false;
					set_is_playing("OFF");
					TrackPlayer.reset().catch((e) => e);
				} catch (e) {}
			};
			// const tables = await db_exec(async(db) => db.all("SELECT * FROM sqlite_master WHERE type='table';"));
			// console.log(tables);
		})().catch((e) => e);
		return () => {
			subscription.remove();
			linking_handler.remove();
		};
	}, []);
	useEffect(() => {
		if (is_playing !== "LOADING") return;
		set_is_playing("ON");
		GLOBALS.global_var.is_playing = true;
	}, [is_playing]);

	const path = usePathname();

	useEffect(() => {
		SharedRouter.set_current_route_path(path);
	}, [path]);

	function update_bottom_alert(text: string, type: BottomAlertType, more_info?: string | ResponseError) {
		set_bottom_alert({
			uuid: gen_uuid(),
			text,
			type,
			more_info: more_info ?? ""
		});
	}

	const theme_value = useMemo(
		() => ({
			...theme,
			fonts: {
				regular: { fontFamily: "", fontWeight: "400" as const },
				medium: { fontFamily: "", fontWeight: "600" as const },
				heavy: { fontFamily: "", fontWeight: "bold" as const },
				bold: { fontFamily: "", fontWeight: "bold" as const }
			}
		}),
		[theme]
	);

	return (
		<GestureHandlerRootView>
			<ThemeProvider value={theme_value}>
				<JSEvaluatorWebView />
				{is_loading ? <IImage style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%" }} source={splash_screen_image} /> : null}
				{is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
				<BottomAlert type={bottom_alert.type} text={bottom_alert.text} uuid={bottom_alert.uuid} more_info={bottom_alert.more_info} />
				{!is_loading ? (
					<SafeAreaProvider>
						<Stack>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						</Stack>
					</SafeAreaProvider>
				) : null}
			</ThemeProvider>
		</GestureHandlerRootView>
	);
});
