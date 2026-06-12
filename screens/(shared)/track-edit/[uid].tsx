import { reinterpret_cast } from "@common/cast";
import IImage from "@components/IImage";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import { IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import { GLOBALS } from "@illusive/globals";
import { Illusive } from "@illusive/illusive";
import { type ArtworkNamedUUID, duration_to_string, get_unique_album_names_with_uris, get_unique_artists } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { SQLfs } from "@illusive/sql/sql_fs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { IllusiveURI, LoadingState, NamedUUID } from "@illusive/types";
import { TrackContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import { SharedRouter } from "@utils/shared_routes";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import * as ffmpeg_kit from "ffmpeg-kit-react-native";
import { ffmpeg } from "@native/ffmpeg/ffmpeg";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ContextMenuButton } from "@components/ContextMenu";

type SetArtistsState = (args: (prev: NamedUUID[]) => NamedUUID[]) => any;

const MAX_SUGGESTIONS = 30;

function ArtistRow(props: { artist: NamedUUID; index: number; total_artists: number; set_artists_state: SetArtistsState; on_focus?: (row: View | null) => void }) {
	const { colors } = usePTheme();

	const all_artists = useMemo(() => get_unique_artists(GLOBALS.global_var.sql_tracks), []);
	const artist_name_ref = useRef(props.artist.name);
	const row_ref = useRef<View>(null);
	const [close_artists, set_close_artists] = useState(() => all_artists.slice(0, MAX_SUGGESTIONS));
	const [input_focused, set_input_focused] = useState(false);

	const is_only = props.total_artists === 1;

	function on_name_change(name: string) {
		artist_name_ref.current = name;
		set_close_artists(all_artists.filter((a) => a?.name?.toLowerCase().includes(name?.toLowerCase())).slice(0, MAX_SUGGESTIONS));
	}

	function on_name_submit() {
		const typed = artist_name_ref.current.trim();
		if (!typed) return;
		const matched = all_artists.find((a) => a.name?.toLowerCase() === typed?.toLowerCase());
		props.set_artists_state((prev) => {
			const updated = [...prev];
			updated[props.index] = matched ? { name: matched.name, uri: matched.uri ?? null } : { name: typed, uri: null };
			return updated;
		});
	}

	function delete_artist() {
		if (is_only) return;
		props.set_artists_state((prev) => prev.filter((_, i) => i !== props.index));
	}

	return (
		<View ref={row_ref}>
			<View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
				<IImage style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.line }} source={SQLArtists.artists_artwork_memo[props.artist.uri ?? ""] ?? SQLArtists.default_profile_picture_url} />
				<View style={{ marginLeft: 14, flex: 1 }}>
					<TextInput
						defaultValue={props.artist.name}
						autoCorrect={false}
						placeholder="Artist name"
						placeholderTextColor={colors.searchPlaceholder}
						style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}
						onFocus={() => {
							set_input_focused(true);
							props.on_focus?.(row_ref.current);
						}}
						onBlur={() => {
							set_input_focused(false);
							on_name_submit();
						}}
						onChangeText={on_name_change}
						onSubmitEditing={on_name_submit}
					/>
					<View style={{ height: 0.5, backgroundColor: colors.text + "40", marginTop: 5 }} />
				</View>
				<TouchableOpacity onPress={delete_artist} style={{ marginLeft: 10, padding: 8 }} disabled={is_only}>
					<Ionicons name="trash-outline" size={20} color={is_only ? colors.subtext : colors.red} />
				</TouchableOpacity>
			</View>
			{input_focused && close_artists.length > 0 ? (
				<View style={{ backgroundColor: colors.card + "ee", borderRadius: 2, overflow: "hidden", borderWidth: 0.5, borderColor: colors.line, marginBottom: 4 }}>
					<ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
						{close_artists.map((artist, i) => (
							<TouchableOpacity
								key={artist.name + String(i)}
								style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < close_artists.length - 1 ? 0.5 : 0, borderBottomColor: colors.line }}
								onPress={() => {
									props.set_artists_state((prev) => {
										const updated = [...prev];
										updated[props.index] = { name: artist.name, uri: (artist as any).uri ?? null };
										return updated;
									});
									artist_name_ref.current = artist.name;
									set_input_focused(false);
									Keyboard.dismiss();
								}}>
								<IImage style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} source={SQLArtists.artists_artwork_memo[(artist as any).uri ?? ""] ?? SQLArtists.default_profile_picture_url} />
								<Text style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: "500" }}>{artist.name}</Text>
								<Ionicons name="chevron-forward" size={13} color={colors.searchPlaceholder} />
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			) : null}
		</View>
	);
}

function QuickDownloadButton(props: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; state: LoadingState; onPress: () => void }) {
	const { colors } = usePTheme();
	const is_complete = props.state === "COMPLETE";
	const is_loading = props.state === "LOADING";
	return (
		<TouchableOpacity
			onPress={props.onPress}
			disabled={is_loading || is_complete}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingHorizontal: 14,
				paddingVertical: 9,
				borderRadius: 5,
				backgroundColor: is_complete ? colors.green + "10" : colors.shelf,
				borderWidth: 0.5,
				borderColor: is_complete ? colors.green + "50" : colors.line,
				opacity: is_complete ? 0.8 : 1.0
			}}>
			{is_loading ? (
				<ActivityIndicator size={14} color={colors.searchPlaceholder} style={{ marginRight: 6 }} />
			) : (
				<Ionicons name={is_complete ? "checkmark" : props.icon} size={14} color={is_complete ? colors.green : colors.searchPlaceholder} style={{ marginRight: 6 }} />
			)}
			<Text style={{ color: is_complete ? colors.green : colors.text, fontSize: 13, fontWeight: "600" }}>{props.label}</Text>
		</TouchableOpacity>
	);
}

export default function EditTrackModal() {
	const { uid } = useLocalSearchParams<{ uid: string }>();
	// useMemo, NOT useRef(expensive()): ref initializer arguments re-run on every
	// render, so these full-library scans executed per keystroke (App Hangs).
	const initial_track = useMemo(() => GLOBALS.global_var.sql_tracks.find((track) => track.uid === uid), [uid]);
	const track_ref = useRef(initial_track);
	const all_albums = useMemo(() => get_unique_album_names_with_uris(GLOBALS.global_var.sql_tracks), []);

	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(track_ref.current);
	const styles = theme_styles(colors);

	const scroll_ref = useRef<ScrollView>(null);
	const scroll_y_ref = useRef(0);
	const title_section_ref = useRef<View>(null);
	const album_section_ref = useRef<View>(null);

	function scroll_view_to(view: View | null, top_offset = 100) {
		if (!view) return;
		view.measureInWindow((_x, window_y) => {
			if (typeof window_y !== "number") return;
			const target = Math.max(0, scroll_y_ref.current + (window_y - top_offset));
			scroll_ref.current?.scrollTo({ y: target, animated: true });
		});
	}

	const title_ref = useRef<string>(track_ref.current?.title ?? "");
	const [editing_title_state, set_editing_title_state] = useState<LoadingState>("NONE");

	const [artists_state, set_artists_state] = useState<NamedUUID[]>(track_ref.current?.artists ?? []);

	const album_ref = useRef<NamedUUID>(track_ref.current?.album ? { ...track_ref.current?.album } : null);
	const album_artwork = useMemo(
		() => (album_ref?.current?.uri ? (GLOBALS.global_var.sql_tracks.find((track) => track.album?.uri === album_ref.current?.uri)?.playback?.artwork ?? Illusive.illusi_dark_icon_index) : Illusive.illusi_dark_icon_index),
		[album_ref.current?.uri]
	);
	const [close_albums, set_close_album] = useState<ArtworkNamedUUID[]>([]);
	useEffect(() => set_close_album(all_albums.filter((album) => album.name?.toLowerCase().includes(album_ref.current?.name?.toLowerCase() ?? "")).slice(0, MAX_SUGGESTIONS)), [album_ref.current?.name]);
	const [album_name_input_focused, set_album_name_input_focused] = useState<boolean>(false);
	const [editing_album_name_state, set_editing_album_name_state] = useState<LoadingState>("NONE");

	const [saving_state, set_saving_state] = useState<LoadingState>("NONE");

	const [download_media_state, set_download_media_state] = useState<LoadingState>(track_ref.current?.media_uri ? "COMPLETE" : "NONE");
	const [download_thumbnail_state, set_download_thumbnail_state] = useState<LoadingState>(track_ref.current?.thumbnail_uri ? "COMPLETE" : "NONE");
	const [download_lyrics_state, set_download_lyrics_state] = useState<LoadingState>(track_ref.current?.lyrics_uri ? "COMPLETE" : "NONE");
	const [lyrics_content, set_lyrics_content] = useState<string | null>(null);

	// FFmpeg state
	const ffmpeg_args_ref = useRef("");
	const [ffmpeg_running, set_ffmpeg_running] = useState(false);
	const [ffmpeg_progress, set_ffmpeg_progress] = useState(0);
	const [ffmpeg_log, set_ffmpeg_log] = useState<string[]>([]);
	const ffmpeg_session_id_ref = useRef<number | null>(null);

	useEffect(() => {
		if (track_ref.current?.lyrics_uri) {
			SQLTracks.read_track_lyrics(track_ref.current).then((content) => {
				if (typeof content === "string") set_lyrics_content(content);
			});
		}
	}, []);

	function on_title_change(new_title: string) {
		title_ref.current = new_title;
		set_editing_title_state("LOADING");
	}
	function on_title_submit() {
		if (track_ref.current && track_ref.current.title !== title_ref.current) {
			track_ref.current.title = title_ref.current;
			set_editing_title_state("COMPLETE");
		} else set_editing_title_state("NONE");
	}

	function append_empty_artist() {
		set_artists_state((prev) => [...prev, { name: "", uri: null }]);
	}

	function on_album_name_change(new_album_name: string) {
		if (album_ref.current === null) album_ref.current = { name: new_album_name, uri: null };
		else album_ref.current.name = new_album_name;
		set_editing_album_name_state("LOADING");
		set_close_album(all_albums.filter((album) => album.name?.toLowerCase().includes(new_album_name?.toLowerCase())).slice(0, MAX_SUGGESTIONS));
	}
	function on_album_name_submit() {
		if (album_ref.current && track_ref.current) {
			const other_album_uri: IllusiveURI | null = album_ref.current?.name ? (GLOBALS.global_var.sql_tracks.find((track) => track.album?.uri && track.album?.name && track.album.name === album_ref.current?.name)?.album?.uri ?? null) : null;
			if ((album_ref.current && !album_ref.current?.uri) || other_album_uri !== null) {
				album_ref.current.uri = other_album_uri;
			}
			set_editing_album_name_state("COMPLETE");
		} else set_editing_album_name_state("NONE");
	}

	async function save_all() {
		if (!track_ref.current) return;
		set_saving_state("LOADING");
		try {
			const other_album_uri: IllusiveURI | null = album_ref.current?.name ? (GLOBALS.global_var.sql_tracks.find((t) => t.album?.uri && t.album.name === album_ref.current?.name)?.album?.uri ?? null) : null;
			if (album_ref.current && (!album_ref.current.uri || other_album_uri !== null)) {
				album_ref.current.uri = other_album_uri;
			}
			await SQLTracks.update_track(track_ref.current.uid, { ...track_ref.current, title: title_ref.current, album: album_ref.current ?? track_ref.current.album, artists: artists_state });
			track_ref.current.title = title_ref.current;
			track_ref.current.artists = artists_state;
			if (album_ref.current) track_ref.current.album = album_ref.current;
			set_saving_state("COMPLETE");
			setTimeout(() => set_saving_state("NONE"), 2000);
		} catch (_) {
			set_saving_state("NONE");
		}
	}

	async function handle_download_media() {
		if (!track_ref.current) return;
		set_download_media_state("LOADING");
		const result = await GLOBALS.global_var.download_track(track_ref.current);
		const success = result === "GOOD" || result === "EXISTS";
		set_download_media_state(success ? "COMPLETE" : "NONE");
		GLOBALS.global_var.bottom_alert?.(success ? "Downloading media" : "Failed to download media", success ? "GOOD" : "WARN");
	}

	async function handle_download_thumbnail() {
		if (!track_ref.current) return;
		set_download_thumbnail_state("LOADING");
		try {
			await SQLTracks.download_thumbnail(track_ref.current);
			set_download_thumbnail_state("COMPLETE");
			GLOBALS.global_var.bottom_alert?.("Downloaded thumbnail", "GOOD");
		} catch {
			set_download_thumbnail_state("NONE");
			GLOBALS.global_var.bottom_alert?.("Failed to download thumbnail", "WARN");
		}
	}

	async function handle_download_lyrics() {
		if (!track_ref.current) return;
		set_download_lyrics_state("LOADING");
		const result = await GLOBALS.global_var.download_track_lyrics(track_ref.current);
		const success = typeof result === "string";
		set_download_lyrics_state(success ? "COMPLETE" : "NONE");
		GLOBALS.global_var.bottom_alert?.(success ? "Downloaded lyrics" : "Failed to download lyrics", success ? "GOOD" : "WARN");
		if (success && track_ref.current?.lyrics_uri) {
			const content = await SQLTracks.read_track_lyrics(track_ref.current);
			if (typeof content === "string") set_lyrics_content(content);
		}
	}

	async function run_ffmpeg() {
		if (!track_ref.current?.media_uri) return;
		const media_path = SQLfs.media_directory(track_ref.current.media_uri);
		const raw = ffmpeg_args_ref.current.replace(/\$dl/g, `"${media_path}"`);
		const args = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
		if (!args.length) return;
		set_ffmpeg_running(true);
		set_ffmpeg_progress(0);
		set_ffmpeg_log([]);
		const dur = track_ref.current.duration;
		try {
			const result = await ffmpeg().execute_args(
				args,
				(stats) => set_ffmpeg_progress(dur > 0 ? Math.min(stats.time_seconds / dur, 1) : 0),
				(line) => set_ffmpeg_log((prev) => [...prev.slice(-200), line])
			);
			ffmpeg_session_id_ref.current = result.session_id;
			const retcode = await result.retcode;
			set_ffmpeg_log((prev) => [...prev, `\n--- Exit code: ${retcode} ---`]);
		} finally {
			set_ffmpeg_running(false);
			ffmpeg_session_id_ref.current = null;
		}
	}

	function cancel_ffmpeg() {
		if (ffmpeg_session_id_ref.current !== null) {
			ffmpeg_kit.FFmpegKit.cancel(ffmpeg_session_id_ref.current);
		}
	}

	const lyrics_preview_lines =
		lyrics_content
			?.split("\n")
			.filter((l) => l.trim())
			.slice(0, 6) ?? [];

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title={"Edit Track"} background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			<ScrollView
				ref={scroll_ref}
				scrollToOverflowEnabled={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="interactive"
				automaticallyAdjustKeyboardInsets
				contentInsetAdjustmentBehavior="never"
				scrollEventThrottle={16}
				onScroll={(e) => {
					scroll_y_ref.current = e.nativeEvent.contentOffset.y;
				}}>
				{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: Dimensions.get("screen").height * 0.8, width: "100%" }} /> : null}

				{/* Artwork */}
				<ContextMenuButton
					menuConfig={{ menuTitle: "", menuItems: TrackContextMenu.track_artwork_folder(track_ref.current ?? ExampleObj.track_example0, "") }}
					onPressMenuItem={async ({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
						ContextResolver.resolve_track_context(track_ref.current, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
					}}>
					<View style={{ width: "100%", alignItems: "center", maxHeight: 450, minHeight: 350, overflow: "hidden", marginTop: 30 }}>
						<ScaledImage tint={{ color: colors.black, opacity: 0.3 }} artwork={track_ref.current?.playback?.artwork} width={Dimensions.get("screen").width * 0.85} style={{ borderRadius: 5, borderWidth: 1, borderColor: colors.line }} />
						<Ionicons
							name="pencil-sharp"
							size={65}
							color={"white"}
							style={{ position: "absolute", left: "41.5%", top: "40%", zIndex: 10, textShadowOffset: { height: 3, width: 4 }, textShadowRadius: 0, textShadowColor: colors.primary }}
						/>
					</View>
				</ContextMenuButton>

				{/* Metadata info bar */}
				<View style={{ flexDirection: "row", justifyContent: "space-around", marginHorizontal: 20, marginTop: 14, marginBottom: 6 }}>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>PLAYS</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{String(track_ref.current?.meta?.plays ?? 0)}</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>DURATION</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{duration_to_string(track_ref.current?.duration ?? 0) || "—"}</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>ADDED</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{track_ref.current?.meta?.added_date ? new Date(track_ref.current.meta.added_date).toLocaleDateString() : "—"}</Text>
					</View>
				</View>

				{/* Quick Downloads */}
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: "row" }}>
					<QuickDownloadButton icon="cloud-download-outline" label="Media" state={download_media_state} onPress={handle_download_media} />
					<QuickDownloadButton icon="image-outline" label="Thumbnail" state={download_thumbnail_state} onPress={handle_download_thumbnail} />
					<QuickDownloadButton icon="document-text-outline" label="Lyrics" state={download_lyrics_state} onPress={handle_download_lyrics} />
				</ScrollView>

				{/* Title */}
				<View ref={title_section_ref} style={styles.section_card}>
					<Text style={styles.section_label}>Title</Text>
					<View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
						<TextInput
							defaultValue={track_ref.current?.title}
							autoCorrect={false}
							placeholder="Enter title"
							placeholderTextColor={colors.searchPlaceholder}
							style={styles.field_input}
							onFocus={() => scroll_view_to(title_section_ref.current)}
							onChangeText={on_title_change}
							onEndEditing={on_title_submit}
							onSubmitEditing={on_title_submit}
						/>
						<View style={{ width: 24, marginLeft: 8 }}>{editing_title_state === "LOADING" ? <ActivityIndicator size={18} /> : editing_title_state === "COMPLETE" ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}</View>
					</View>
					<View style={styles.field_divider} />
				</View>

				{/* Artists */}
				<View style={styles.section_card}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Text style={styles.section_label}>Artists</Text>
						<IoniconsTouchableOpacity icon_name="add-circle-sharp" icon_color={colors.primary} icon_size={22} on_press={append_empty_artist} style={{ marginLeft: 8 }} />
					</View>
					<View style={{ marginTop: 6 }}>
						{artists_state.map((artist, i) => (
							<ArtistRow key={i + artist.name} artist={artist} index={i} total_artists={artists_state.length} set_artists_state={set_artists_state} on_focus={scroll_view_to} />
						))}
					</View>
				</View>

				{/* Album */}
				<View ref={album_section_ref} style={styles.section_card}>
					<Text style={styles.section_label}>Album</Text>
					<View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
						<IImage source={album_artwork} style={{ height: 60, width: 60, borderRadius: 2, borderWidth: 1, borderColor: colors.line }} />
						<View style={{ flex: 1, marginLeft: 14 }}>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<TextInput
									defaultValue={track_ref.current?.album?.name}
									autoCorrect={false}
									placeholder="Album name"
									placeholderTextColor={colors.searchPlaceholder}
									style={[styles.field_input, { marginLeft: 0, flex: 1 }]}
									onChangeText={on_album_name_change}
									onEndEditing={on_album_name_submit}
									onSubmitEditing={on_album_name_submit}
									onBlur={() => set_album_name_input_focused(false)}
									onFocus={() => {
										set_album_name_input_focused(true);
										scroll_view_to(album_section_ref.current, 260);
									}}
								/>
								<View style={{ width: 24, marginLeft: 8 }}>
									{editing_album_name_state === "LOADING" ? <ActivityIndicator size={18} /> : editing_album_name_state === "COMPLETE" ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}
								</View>
							</View>
							<View style={styles.field_divider} />
						</View>
					</View>
				</View>
				{album_name_input_focused && close_albums.length > 0 ? (
					<View style={{ backgroundColor: colors.card + "ee", borderRadius: 2, overflow: "hidden", borderWidth: 0.5, borderColor: colors.line, marginHorizontal: 16, marginTop: 4 }}>
						<ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
							{close_albums.map((album, i) => (
								<TouchableOpacity
									key={album.name + (album.uri ?? "")}
									style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < close_albums.length - 1 ? 0.5 : 0, borderBottomColor: colors.line }}
									onPress={() => {
										album_ref.current = { name: album.name, uri: album.uri ?? null };
										set_editing_album_name_state("LOADING");
										set_album_name_input_focused(false);
										Keyboard.dismiss();
									}}>
									<IImage source={album.artwork} style={{ width: 44, height: 44, borderRadius: 2, marginRight: 12, borderWidth: 1, borderColor: colors.line }} />
									<Text style={{ color: colors.text, flex: 1, fontSize: 15, fontWeight: "500" }}>{album.name}</Text>
									<Ionicons name="chevron-forward" size={14} color={colors.searchPlaceholder} />
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				) : null}

				{/* Media — only shown when the track has media */}
				{track_ref.current?.media_uri ? (
					<View style={styles.section_card}>
						<Text style={styles.section_label}>Media</Text>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
							Run FFmpeg commands on the downloaded file. Use <Text style={{ fontFamily: "monospace", color: colors.text + "aa" }}>$dl</Text> to reference the media path.
						</Text>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, marginTop: 8 }} numberOfLines={1} ellipsizeMode="middle">
							{SQLfs.media_directory(track_ref.current.media_uri)}
						</Text>
						<View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
							<TextInput
								style={{ flex: 1, color: colors.text, fontSize: 13, backgroundColor: colors.background, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 8, fontFamily: "monospace", borderWidth: 1, borderColor: colors.line }}
								placeholder="-i $dl -c copy output.m4a"
								placeholderTextColor={colors.searchPlaceholder}
								autoCorrect={false}
								autoCapitalize="none"
								onChangeText={(t) => {
									ffmpeg_args_ref.current = t;
								}}
								editable={!ffmpeg_running}
							/>
							<TouchableOpacity
								style={{ marginLeft: 10, backgroundColor: ffmpeg_running ? colors.red : colors.primary, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.line }}
								onPress={ffmpeg_running ? cancel_ffmpeg : run_ffmpeg}>
								<Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{ffmpeg_running ? "Cancel" : "Run"}</Text>
							</TouchableOpacity>
						</View>
						{ffmpeg_running || ffmpeg_progress > 0 ? (
							<View style={{ height: 5, backgroundColor: colors.line, borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
								<View style={{ height: "100%", width: `${ffmpeg_progress * 100}%` as any, backgroundColor: colors.primary, borderRadius: 3 }} />
							</View>
						) : null}
						{ffmpeg_log.length > 0 ? (
							<ScrollView style={{ marginTop: 8, maxHeight: 150, backgroundColor: colors.background + "99", borderRadius: 2, padding: 8 }} nestedScrollEnabled>
								{ffmpeg_log.map((line, i) => (
									<Text key={i} style={{ color: colors.subtext, fontSize: 10 }}>
										{line}
									</Text>
								))}
							</ScrollView>
						) : null}
					</View>
				) : null}

				{/* Lyrics */}
				<View style={styles.section_card}>
					<Text style={styles.section_label}>Lyrics</Text>
					{lyrics_preview_lines.length > 0 ? (
						<>
							<View style={{ marginTop: 10, paddingHorizontal: 4 }}>
								{lyrics_preview_lines.map((line, i) => (
									<Text key={i} style={{ color: i === lyrics_preview_lines.length - 1 ? colors.searchPlaceholder + "88" : colors.text + "cc", fontSize: 14, lineHeight: 22, fontStyle: "italic" }}>
										{line}
									</Text>
								))}
								{(lyrics_content?.split("\n").filter((l) => l.trim()).length ?? 0) > 6 ? (
									<Text style={{ color: colors.searchPlaceholder, fontSize: 12, marginTop: 4 }}>+{(lyrics_content?.split("\n").filter((l) => l.trim()).length ?? 0) - 6} more lines</Text>
								) : null}
							</View>
							<TouchableOpacity style={[styles.action_button, { marginTop: 14 }]} onPress={() => SharedRouter.goto_shared_player_lyrics_edit(track_ref.current?.lyrics_uri ?? "")}>
								<Ionicons name="pencil-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
								<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Edit Lyrics</Text>
							</TouchableOpacity>
						</>
					) : (
						<Text style={{ color: colors.searchPlaceholder, fontSize: 14, marginTop: 8 }}>No lyrics downloaded. Use the Lyrics button above to fetch them.</Text>
					)}
				</View>

				{/* Save button */}
				<TouchableOpacity
					style={{
						width: "88%",
						alignSelf: "center",
						height: 55,
						backgroundColor: colors.primary,
						borderRadius: 10,
						alignItems: "center",
						justifyContent: "center",
						marginTop: 28,
						marginBottom: 20,
						borderWidth: 1,
						borderColor: colors.line
					}}
					onPress={save_all}
					disabled={saving_state === "LOADING"}>
					{saving_state === "LOADING" ? (
						<ActivityIndicator size={28} color={colors.text} />
					) : saving_state === "COMPLETE" ? (
						<Ionicons name="checkmark" size={28} color={colors.text} />
					) : (
						<Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Save</Text>
					)}
				</TouchableOpacity>

				<View style={{ height: 60 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_card: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.shelf + "60", borderRadius: 2, borderWidth: 0.5, borderColor: colors.line, padding: 16 },
		section_label: { color: colors.text, fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
		field_input: { color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 4, flex: 1 },
		field_divider: { height: 0.5, backgroundColor: colors.text + "30", marginTop: 6 },
		action_button: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "18", borderRadius: 2, paddingVertical: 12, borderWidth: 0.5, borderColor: colors.primary + "30" }
	});
