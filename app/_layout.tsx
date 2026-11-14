import { Stack, usePathname } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as Font from "expo-font";
import { Ionicons, MaterialIcons, Entypo, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomAlertType, PlayingState, Track } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { filter_play_tracks } from "@illusive/play";
import { playback_service } from "@illusive/track_player_service";
import BottomAlert from "@components/BottomAlert";
import appConfig from "app.config";
import EverythingPlayer from "react-native-everything-player";
import { Image as ExpoImage } from "expo-image";
import type { ConfigContext } from "expo/config";
import { ThemeProvider } from "expo-router/react-navigation";
import { get_shortcut_subscription, on_app_load } from "@illusive/startup";
import { reinterpret_cast } from "@common/cast";
import { gen_uuid, milliseconds_of } from "@common/utils/util";
import AudioPlayer from "@screens/AudioPlayer";
import ExternalDisplayHost from "@components/external_display/ExternalDisplayHost";
import OTAUpdateIndicator from "@components/OTAUpdateIndicator";
import { GLOBALS } from "@illusive/globals";
import { load_illusi_icons } from "@utils/load_illusi_icons";
import * as Sentry from "@sentry/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SharedRouter } from "@utils/shared_routes";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ResponseError } from "@common/types";
import { get_linking_handler } from "@utils/linking";
import { breadcrumb as log_breadcrumb, initialize_sentry_severity_handler, set_breadcrumb_console_sink } from "@common/sentry_error_handler";
import { AppState, Platform } from "react-native";
import { check_and_apply_update, mark_launch_success } from "@utils/ota_update";
import { report_memory_warning, set_perf_context_provider, start_heap_monitor, start_perf_monitor, start_thermal_monitor, stop_heap_monitor, stop_perf_monitor, stop_thermal_monitor } from "@utils/perf_monitor";
import nodejs from "nodejs-mobile-react-native";
// TODO fix carplay in future; + make UI actually good; too buggy for prod right now, causing crashes
// CarPlayService is iOS-only; will be gated below
let CarPlayService: any;
if (Platform.OS === "ios") {
	const carplayModule = require("@illusive/carplay_service");
	CarPlayService = carplayModule.CarPlayService;
}

EverythingPlayer.registerPlaybackService(() => playback_service);

ExpoImage.configureCache({ maxMemoryCost: 128 * 1024 * 1024, maxDiskSize: 512 * 1024 * 1024 });

const OTA_ENABLED = true;
Sentry.init({
	dsn: "https://9c6195e4f85113499be07c6bc8402993@o4510064302227456.ingest.us.sentry.io/4510064306159616",

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	attachStacktrace: true,

	// Enable Logs
	// enableLogs: true,
	// enabled: true
	enabled: !__DEV__,

	maxBreadcrumbs: 50,
	normalizeDepth: 3,
	beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
		if (breadcrumb.data === undefined) return breadcrumb;
		const MAX_DATA_CHARS = 4096;
		const MAX_FIELD_CHARS = 512;

		// Kill the recursion: never let a breadcrumb carry another breadcrumb.
		const data: Record<string, unknown> = { ...breadcrumb.data };
		delete data.crumb;

		let serialized_length: number;
		try {
			serialized_length = JSON.stringify(data).length;
		} catch {
			// Circular/unserializable data would also choke the native layer.
			return { ...breadcrumb, data: { dropped: "[unserializable breadcrumb data]" } };
		}
		if (serialized_length <= MAX_DATA_CHARS) return { ...breadcrumb, data };

		// Oversized: keep primitives, truncate long strings, replace big objects.
		const slim: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === "string") {
				slim[key] = value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)} [truncated ${value.length} chars]` : value;
			} else if (value === null || typeof value === "number" || typeof value === "boolean") {
				slim[key] = value;
			} else {
				let field_length = -1;
				try {
					field_length = JSON.stringify(value)?.length ?? -1;
				} catch {
					field_length = -1;
				}
				slim[key] = field_length >= 0 && field_length <= MAX_FIELD_CHARS ? value : `[truncated ${field_length >= 0 ? `${field_length} chars` : "unserializable object"}]`;
			}
		}
		return { ...breadcrumb, data: slim };
	}

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
	const [is_loading, set_is_loading] = useState(true);
	const [bottom_alert, set_bottom_alert] = useState({ uuid: "", text: "", type: "GOOD" as BottomAlertType, more_info: "" as string | ResponseError });

	async function play_tracks(start_track: Track, tracks: Track[], title: string, force_order?: boolean) {
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
		tracks = await filter_play_tracks(start_track, tracks, title, force_order);
		if (tracks.length === 0) return;
		set_playing_tracks(tracks);
		set_playing_from(title);
		set_is_playing("LOADING");
	}

	useEffect(() => {
		set_breadcrumb_console_sink(__DEV__);
		initialize_sentry_severity_handler();
		let ota_check_timer: ReturnType<typeof setTimeout> | undefined;
		if (Platform.OS !== "android" && Platform.OS !== "web") {
			nodejs.start("main.js");
			nodejs.channel.addListener("message", (msg) => {
				Sentry.addBreadcrumb({ message: "From node: " + msg + "@" + new Date().getTime() });
			});
		}
		start_perf_monitor();
		start_thermal_monitor();
		start_heap_monitor();

		const linking_handler = get_linking_handler();

		const subscription = get_shortcut_subscription(play_tracks);
		load_illusi_icons();
		(async () => {
			const app_load_t0 = Date.now();
			await Promise.all([
				Font.loadAsync({ ...Ionicons.font, ...MaterialIcons.font, ...Entypo.font, ...FontAwesome5.font, ...MaterialCommunityIcons.font }).then(() => {
					log_breadcrumb("startup", "fonts loaded", { elapsed_ms: Date.now() - app_load_t0 });
				}),
				on_app_load(appConfig(reinterpret_cast<ConfigContext["config"]>({})).version!, play_tracks, set_theme, update_bottom_alert, set_is_loading)
			]);
			log_breadcrumb("startup", "app load complete", { total_ms: Date.now() - app_load_t0 });
			if (OTA_ENABLED) {
				ota_check_timer = setTimeout(() => {
					check_and_apply_update().catch((e) => e);
				}, 5000);
			}
			GLOBALS.global_var.kill_audioplayer = () => {
				if (!GLOBALS.global_var.is_playing) return;
				try {
					GLOBALS.global_var.is_playing = false;
					set_is_playing("OFF");
					EverythingPlayer.reset();
				} catch (e) {}
			};
			// Initialize CarPlay (iOS only)
			if (CarPlayService) {
				try {
					CarPlayService.init();
				} catch (e) {
					log_breadcrumb("startup", "carplay init failed", { error: String(e) });
				}
			}
		})().catch((e) => e);
		const memory_warning_subscription = AppState.addEventListener("memoryWarning", () => {
			ExpoImage.clearMemoryCache().catch((e) => e);
			report_memory_warning();
		});
		return () => {
			subscription.remove();
			linking_handler.remove();
			memory_warning_subscription.remove();
			if (ota_check_timer) clearTimeout(ota_check_timer);
			stop_perf_monitor();
			stop_thermal_monitor();
			stop_heap_monitor();
			// Cleanup CarPlay (iOS only)
			if (CarPlayService) {
				CarPlayService.destroy();
			}
		};
	}, []);
	useEffect(() => {
		if (is_loading) return;
		const healthy_timer = setTimeout(() => {
			mark_launch_success().catch((e) => e);
		}, 4000);
		return () => clearTimeout(healthy_timer);
	}, [is_loading]);
	useEffect(() => {
		if (is_playing !== "LOADING") return;
		set_is_playing("ON");
		GLOBALS.global_var.is_playing = true;
	}, [is_playing]);

	const path = usePathname();

	useEffect(() => {
		SharedRouter.set_current_route_path(path);
	}, [path]);

	// Attach live context so a saturation report says where/what was happening.
	useEffect(() => {
		set_perf_context_provider(() => ({ route: path, is_playing, queue_length: playing_tracks.length }));
	}, [path, is_playing, playing_tracks.length]);

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
				{/* {is_loading ? <Image style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%" }} source={splash_screen_image} /> : null} */}
				{is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
				{!is_loading ? <ExternalDisplayHost /> : null}
				{!is_loading ? <OTAUpdateIndicator /> : null}
				<BottomAlert type={bottom_alert.type} text={bottom_alert.text} uuid={bottom_alert.uuid} more_info={bottom_alert.more_info} />
				<SafeAreaProvider>
					<Stack>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="+not-found" options={{ headerShown: false }} />
					</Stack>
				</SafeAreaProvider>
			</ThemeProvider>
		</GestureHandlerRootView>
	);
});
