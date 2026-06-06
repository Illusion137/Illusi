import { Stack, usePathname } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as Font from "expo-font";
import { Ionicons, MaterialIcons, Entypo, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { gen_uuid, milliseconds_of } from "@common/utils/util";
import AudioPlayer from "@screens/AudioPlayer";
import AudiobookSlidingPlayer from "@screens/audiobook/AudiobookSlidingPlayer";
import ExternalDisplayHost from "@components/external_display/ExternalDisplayHost";
import SyncPlayIndicator from "@components/SyncPlayIndicator";
import { GLOBALS } from "@illusive/globals";
import { AudiobookPlayer } from "@illusive/audiobook_player_service";
import { AudiobookDownloads } from "@illusive/audiobook_downloads";
import { extract_epub_metadata_from_file } from "@utils/epub_extractor";
import { load_illusi_icons } from "@utils/load_illusi_icons";
import * as Sentry from "@sentry/react-native";
import IImage from "@components/IImage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SharedRouter } from "@utils/shared_routes";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ResponseError } from "@common/types";
import { get_linking_handler } from "@utils/linking";
import nodejs from "nodejs-mobile-react-native";
import { initialize_sentry_severity_handler } from "@common/sentry_error_handler";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { check_and_apply_update, mark_launch_success } from "@utils/ota_update";
// TODO fix carplay in future; + make UI actually good; too buggy for prod right now, causing crashes
// CarPlayService is iOS-only; will be gated below
let CarPlayService: any;
if (Platform.OS === "ios") {
	const carplayModule = require("@illusive/carplay/carplay_service");
	CarPlayService = carplayModule.CarPlayService;
}

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

let ignore_fat_fingers = false;
export default Sentry.wrap(function App() {
	const [theme, set_theme] = useState<Prefs.Theme>(Prefs.get_theme(Prefs.get_pref("theme")));
	const [playing_tracks, set_playing_tracks] = useState<Track[]>([]);
	const [playing_from, set_playing_from] = useState("");
	const [is_playing, set_is_playing] = useState<PlayingState>("OFF");
	const [audiobook_uuid, set_audiobook_uuid] = useState<string | null>(null);
	const [is_loading, set_is_loading] = useState(true);
	const [bottom_alert, set_bottom_alert] = useState({ uuid: "", text: "", type: "GOOD" as BottomAlertType, more_info: "" as string | ResponseError });

	async function play_tracks(start_track: Track, tracks: Track[], title: string) {
		if (Prefs.get_pref("ignore_fat_finger_for_seconds") > 0) {
			if (ignore_fat_fingers) return;
			ignore_fat_fingers = true;
			setTimeout(
				() => {
					ignore_fat_fingers = false;
				},
				milliseconds_of({ seconds: Prefs.get_pref("ignore_fat_finger_for_seconds") })
			);
		}
		tracks = await filter_play_tracks(start_track, tracks, title);
		if (tracks.length === 0) return;
		// Music takes the shared player over from the audiobook side: drop the
		// overlay and release ownership so the music setup can reset+reload.
		// Both calls are idempotent, so no need to read audiobook_uuid (stale in
		// this mount-time closure).
		set_audiobook_uuid(null);
		AudiobookPlayer.mark_inactive();
		set_playing_tracks(tracks);
		set_playing_from(title);
		set_is_playing("LOADING");
	}

	useEffect(() => {
		// Initialize nodejs worker (mobile only)
		if (Platform.OS !== "android" && Platform.OS !== "web") {
			nodejs.start("main.js");
			nodejs.channel.addListener("message", (msg) => {
				Sentry.addBreadcrumb({ message: "From node: " + msg });
			});
		}
		initialize_sentry_severity_handler();

		const linking_handler = get_linking_handler();

		const subscription = get_shortcut_subscription(play_tracks);
		load_illusi_icons();
		(async () => {
			await Font.loadAsync({ ...Ionicons.font, ...MaterialIcons.font, ...Entypo.font, ...FontAwesome5.font, ...MaterialCommunityIcons.font });
			await on_app_load(appConfig(reinterpret_cast<ConfigContext["config"]>({})).version!, play_tracks, set_is_loading, set_theme, update_bottom_alert);
			mark_launch_success().catch((e) => e);
			GLOBALS.global_var.kill_audioplayer = () => {
				if (!GLOBALS.global_var.is_playing) return;
				try {
					GLOBALS.global_var.is_playing = false;
					set_is_playing("OFF");
					TrackPlayer.reset().catch((e) => e);
				} catch (e) {}
			};
			// Opening an audiobook takes the shared player over from music: tear
			// the music player down first, then mount the audiobook overlay.
			GLOBALS.global_var.open_audiobook = (uuid: string) => {
				GLOBALS.global_var.kill_audioplayer();
				set_audiobook_uuid(uuid);
			};
			// The roz parser's cover heuristic drops most epub covers, so during a
			// remote import pull the epub's declared OPF cover from the downloaded
			// source. Returns a RELATIVE path (or undefined to keep the current).
			GLOBALS.global_var.enhance_audiobook_cover = async (uuid: string, source_path: string) => {
				if (!source_path.toLowerCase().endsWith(".epub")) return undefined;
				const local = source_path.startsWith("file://") ? source_path.slice("file://".length) : source_path;
				const meta = await extract_epub_metadata_from_file(local, uuid);
				return meta.cover_path && meta.cover_path.length > 0 ? meta.cover_path : undefined;
			};
			// Pick up any remote imports interrupted by a previous app close.
			AudiobookDownloads.resume_all().catch((e) => e);
			// Initialize CarPlay (iOS only)
			if (CarPlayService) {
				CarPlayService.init();
			}
			check_and_apply_update().catch((e) => e);
		})().catch((e) => e);
		// Snapshot resume tokens for in-flight downloads when backgrounding, and
		// restart them when we come back, so a download survives a suspend/kill.
		const app_state_subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
			if (next === "active") AudiobookDownloads.resume_all().catch((e) => e);
			else if (next === "background" || next === "inactive") AudiobookDownloads.persist_for_background().catch((e) => e);
		});
		return () => {
			subscription.remove();
			linking_handler.remove();
			app_state_subscription.remove();
			// Cleanup CarPlay (iOS only)
			if (CarPlayService) {
				CarPlayService.destroy();
			}
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
		set_bottom_alert({ uuid: gen_uuid(), text, type, more_info: more_info ?? "" });
	}

	const theme_value = useMemo(
		() => ({
			...theme,
			fonts: { regular: { fontFamily: "", fontWeight: "400" as const }, medium: { fontFamily: "", fontWeight: "600" as const }, heavy: { fontFamily: "", fontWeight: "bold" as const }, bold: { fontFamily: "", fontWeight: "bold" as const } }
		}),
		[theme]
	);

	return (
		<GestureHandlerRootView>
			<ThemeProvider value={theme_value}>
				{is_loading ? <IImage style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%" }} source={splash_screen_image} /> : null}
				{is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
				{audiobook_uuid !== null && <AudiobookSlidingPlayer key={audiobook_uuid} uuid={audiobook_uuid} on_dismiss={() => set_audiobook_uuid(null)} />}
				{!is_loading ? <ExternalDisplayHost /> : null}
				{!is_loading ? <SyncPlayIndicator /> : null}
				<BottomAlert type={bottom_alert.type} text={bottom_alert.text} uuid={bottom_alert.uuid} more_info={bottom_alert.more_info} />
				{!is_loading ? (
					<SafeAreaProvider>
						<Stack>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
							<Stack.Screen name="+not-found" options={{ headerShown: false }} />
						</Stack>
					</SafeAreaProvider>
				) : null}
			</ThemeProvider>
		</GestureHandlerRootView>
	);
});
