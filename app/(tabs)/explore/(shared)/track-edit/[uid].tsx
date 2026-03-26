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
import type { IllusiveURI, LoadingState, NamedUUID, Track } from "@illusive/types";
import { TrackContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import * as ffmpeg_kit from "ffmpeg-kit-react-native";
import { ffmpeg } from "@native/ffmpeg/ffmpeg";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ContextMenuButton, ContextMenuView } from "react-native-ios-context-menu";

interface TrackEditables {
	track: Track;
	title: string;
	album: NamedUUID;
	artists: NamedUUID[];
}

async function save_track(editables: TrackEditables) {
	await SQLTracks.update_track(editables.track.uid, {
		...editables.track,
		title: editables.title,
		album: editables.album,
		artists: editables.artists
	});
}

type SetArtistsState = (args: (prev: NamedUUID[]) => NamedUUID[]) => any;

function EditArtistPreview(props: { track: Track; artist: NamedUUID; index: number; total_artists: number; set_artists_state: SetArtistsState }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const all_artists_ref = useRef(get_unique_artists(GLOBALS.global_var.sql_tracks));
	const artist_name_ref = useRef(props.artist.name);
	const [close_artists, set_close_artists] = useState(all_artists_ref.current);
	const [input_focused, set_input_focused] = useState(false);

	const is_only = props.total_artists === 1;

	function on_name_change(name: string) {
		artist_name_ref.current = name;
		set_close_artists(all_artists_ref.current.filter((a) => a?.name?.toLowerCase().includes(name?.toLowerCase())));
	}

	function on_name_submit() {
		const typed = artist_name_ref.current.trim();
		if (!typed) return;
		const matched = all_artists_ref.current.find((a) => a.name?.toLowerCase() === typed?.toLowerCase());
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
		<View style={{ margin: 20, width: 260 }}>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
				<IImage style={{ width: 56, height: 56, borderRadius: 28 }} source={SQLArtists.artists_artwork_memo[props.artist.uri ?? ""] ?? SQLArtists.default_profile_picture_url} />
				<View style={{ marginLeft: 12, flex: 1 }}>
					<TextInput
						defaultValue={props.artist.name}
						autoCorrect={false}
						placeholder="Artist name"
						placeholderTextColor={colors.searchPlaceholder}
						style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}
						onFocus={() => set_input_focused(true)}
						onBlur={() => {
							set_input_focused(false);
							on_name_submit();
						}}
						onChangeText={on_name_change}
						onSubmitEditing={on_name_submit}
					/>
					<View style={{ height: 0.5, backgroundColor: colors.text, marginTop: 4 }} />
				</View>
				<TouchableOpacity onPress={delete_artist} style={{ marginLeft: 12, padding: 6 }} disabled={is_only}>
					<Ionicons name="trash-outline" size={22} color={is_only ? colors.searchPlaceholder : "#e05555"} />
				</TouchableOpacity>
			</View>
			{input_focused && close_artists.length > 0 ? (
				<View style={{ backgroundColor: "#1a1a1aee", borderRadius: 12, overflow: "hidden", borderWidth: 0.5, borderColor: "#ffffff18", marginTop: 4 }}>
					<ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
						{close_artists.map((artist, i) => (
							<TouchableOpacity
								key={artist.name + String(i)}
								style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: i < close_artists.length - 1 ? 0.5 : 0, borderBottomColor: "#ffffff12" }}
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
								<IImage style={{ width: 38, height: 38, borderRadius: 19, marginRight: 12 }} source={SQLArtists.artists_artwork_memo[(artist as any).uri ?? ""] ?? SQLArtists.default_profile_picture_url} />
								<Text style={{ color: colors.text, flex: 1, fontSize: 15, fontWeight: "500" }}>{artist.name}</Text>
								<Ionicons name="chevron-forward" size={14} color={colors.searchPlaceholder} />
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			) : null}
		</View>
	);
}

function EditArtist(props: { track: Track; artist: NamedUUID; index: number; total_artists: number; set_artists_state: SetArtistsState }) {
	const { colors } = usePTheme();
	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			previewConfig={{
				previewType: "CUSTOM",
				previewSize: "INHERIT",
				backgroundColor: colors.background,
				preferredCommitStyle: "pop"
			}}
			renderPreview={() => <EditArtistPreview artist={props.artist} index={props.index} total_artists={props.total_artists} track={props.track} set_artists_state={props.set_artists_state} />}>
			<View style={{ justifyContent: "center", alignItems: "center", width: 65, marginRight: 10, marginTop: 10 }}>
				<IImage style={{ width: 55, height: 55, borderRadius: 50 }} source={SQLArtists.artists_artwork_memo[props.artist.uri ?? ""] ?? SQLArtists.default_profile_picture_url} />
				<Text numberOfLines={1} style={{ color: colors.text, fontSize: 11, marginTop: 4 }}>
					{props.artist.name || "—"}
				</Text>
			</View>
		</ContextMenuView>
	);
}

export default function EditTrackModal() {
	const { uid } = useLocalSearchParams<{ uid: string }>();
	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find((track) => track.uid === uid));
	const all_albums_ref = useRef(get_unique_album_names_with_uris(GLOBALS.global_var.sql_tracks));

	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(track_ref.current);
	const styles = theme_styles(colors);

	const title_ref = useRef<string>(track_ref.current?.title ?? "");
	const [editing_title_state, set_editing_title_state] = useState<LoadingState>("NONE");

	const [artists_state, set_artists_state] = useState<NamedUUID[]>(track_ref.current?.artists ?? []);

	const album_ref = useRef<NamedUUID>(track_ref.current?.album ? { ...track_ref.current?.album } : null);
	const album_artwork = useMemo(() => (album_ref?.current?.uri ? GLOBALS.global_var.sql_tracks.find((track) => track.album?.uri === album_ref.current?.uri)?.playback?.artwork ?? Illusive.illusi_dark_icon_index : Illusive.illusi_dark_icon_index), [album_ref.current?.uri]);
	const [close_albums, set_close_album] = useState<ArtworkNamedUUID[]>([]);
	useEffect(() => set_close_album(all_albums_ref.current?.filter((album) => album.name?.toLowerCase().includes(album_ref.current?.name?.toLowerCase() ?? ""))), [album_ref.current?.name]);
	const [album_name_input_focused, set_album_name_input_focused] = useState<boolean>(false);
	const [editing_album_name_state, set_editing_album_name_state] = useState<LoadingState>("NONE");

	const [saving_state, set_saving_state] = useState<LoadingState>("NONE");

	// FFmpeg state
	const ffmpeg_args_ref = useRef("");
	const [ffmpeg_running, set_ffmpeg_running] = useState(false);
	const [ffmpeg_progress, set_ffmpeg_progress] = useState(0);
	const [ffmpeg_log, set_ffmpeg_log] = useState<string[]>([]);
	const ffmpeg_session_id_ref = useRef<number | null>(null);

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
		set_close_album(all_albums_ref.current?.filter((album) => album.name?.toLowerCase().includes(new_album_name?.toLowerCase())));
	}
	function on_album_name_submit() {
		if (album_ref.current && track_ref.current) {
			const other_album_uri: IllusiveURI | null = album_ref.current?.name ? GLOBALS.global_var.sql_tracks.find((track) => track.album?.uri && track.album?.name && track.album.name === album_ref.current?.name)?.album?.uri ?? null : null;
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
			const other_album_uri: IllusiveURI | null = album_ref.current?.name ? GLOBALS.global_var.sql_tracks.find((t) => t.album?.uri && t.album.name === album_ref.current?.name)?.album?.uri ?? null : null;
			if (album_ref.current && (!album_ref.current.uri || other_album_uri !== null)) {
				album_ref.current.uri = other_album_uri;
			}
			await SQLTracks.update_track(track_ref.current.uid, {
				...track_ref.current,
				title: title_ref.current,
				album: album_ref.current ?? track_ref.current.album,
				artists: artists_state
			});
			track_ref.current.title = title_ref.current;
			track_ref.current.artists = artists_state;
			if (album_ref.current) track_ref.current.album = album_ref.current;
			set_saving_state("COMPLETE");
		} catch (_) {
			set_saving_state("NONE");
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

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title={"Edit Track"} background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			<ScrollView scrollToOverflowEnabled={false} keyboardShouldPersistTaps="handled">
				{track_colors ? (
					<LinearGradient
						colors={[track_colors.primary, track_colors.background, "transparent"]}
						style={{
							position: "absolute",
							top: 0,
							height: Dimensions.get("screen").height * 0.8,
							width: "100%"
						}}
					/>
				) : null}

				{/* Artwork */}
				<ContextMenuButton
					menuConfig={{ menuTitle: "", menuItems: TrackContextMenu.track_artwork_folder(track_ref.current ?? ExampleObj.track_example0, "") }}
					onPressMenuItem={async ({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
						ContextResolver.resolve_track_context(track_ref.current, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
					}}>
					<TouchableOpacity style={{ width: "100%", alignItems: "center", maxHeight: 450, minHeight: 350, overflow: "hidden", marginTop: 30 }}>
						<ScaledImage tint={{ color: "#000000", opacity: 0.3 }} artwork={track_ref.current?.playback?.artwork} width={Dimensions.get("screen").width * 0.85} style={{ borderRadius: 10 }} />
						<Ionicons name="pencil-sharp" size={65} color={"white"} style={{ position: "absolute", left: "42%", top: "42%", zIndex: 10 }} />
					</TouchableOpacity>
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

				{/* Title */}
				<Text style={styles.section_label}>Title</Text>
				<View style={{ flexDirection: "row", alignItems: "flex-end" }}>
					<TextInput defaultValue={track_ref.current?.title} autoCorrect={false} placeholder="Enter Title" placeholderTextColor={colors.searchPlaceholder} style={styles.field_input} onChangeText={on_title_change} onEndEditing={on_title_submit} onSubmitEditing={on_title_submit} />
					{editing_title_state === "LOADING" ? <ActivityIndicator size={24} style={{ marginBottom: 6 }} /> : editing_title_state === "COMPLETE" ? <Ionicons name="checkmark" size={24} color={colors.green} style={{ marginBottom: 6 }} /> : null}
				</View>
				<View style={styles.divider} />

				{/* Artists */}
				<View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginHorizontal: 25 }}>
					<Text style={styles.section_label_inline}>Artists</Text>
					<IoniconsTouchableOpacity icon_name="add-circle-sharp" icon_color={colors.primary} icon_size={26} on_press={append_empty_artist} style={{ marginLeft: 8 }} />
				</View>
				<ScrollView horizontal contentContainerStyle={{ alignItems: "center", minHeight: 90, paddingLeft: 25, paddingRight: 15 }} showsHorizontalScrollIndicator={false}>
					{artists_state.map((artist, i) => (
						<EditArtist key={i + artist.name} artist={artist} index={i} total_artists={artists_state.length} track={track_ref.current!} set_artists_state={set_artists_state} />
					))}
				</ScrollView>

				{/* Album */}
				<Text style={{ ...styles.section_label, marginTop: 22 }}>Album</Text>
				<View style={{ flexDirection: "row", marginTop: 10 }}>
					<IImage source={album_artwork} style={{ height: 65, width: 65, marginLeft: 20, borderRadius: 5 }} />
					<View style={{ flex: 1, marginLeft: 12, marginRight: 20 }}>
						<View style={{ flexDirection: "row", alignItems: "flex-end" }}>
							<TextInput defaultValue={track_ref.current?.album?.name} autoCorrect={false} placeholder="Enter Album Name" placeholderTextColor={colors.searchPlaceholder} style={[styles.field_input, { flex: 1 }]} onChangeText={on_album_name_change} onEndEditing={on_album_name_submit} onSubmitEditing={on_album_name_submit} onBlur={() => set_album_name_input_focused(false)} onFocus={() => set_album_name_input_focused(true)} />
							{editing_album_name_state === "LOADING" ? <ActivityIndicator size={24} style={{ marginBottom: 6 }} /> : editing_album_name_state === "COMPLETE" ? <Ionicons name="checkmark" size={24} color={colors.green} style={{ marginBottom: 6 }} /> : null}
						</View>
						<View style={styles.divider} />
					</View>
				</View>
				{album_name_input_focused && close_albums.length > 0 ? (
					<View style={{ backgroundColor: "#1a1a1aee", borderRadius: 12, overflow: "hidden", borderWidth: 0.5, borderColor: "#ffffff18", marginHorizontal: 20, marginTop: 4 }}>
						<ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
							{close_albums.map((album, i) => (
								<TouchableOpacity
									key={album.name + (album.uri ?? "")}
									style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < close_albums.length - 1 ? 0.5 : 0, borderBottomColor: "#ffffff12" }}
									onPress={() => {
										album_ref.current = { name: album.name, uri: album.uri ?? null };
										set_editing_album_name_state("LOADING");
										set_album_name_input_focused(false);
										Keyboard.dismiss();
									}}>
									<IImage source={album.artwork} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 12 }} />
									<Text style={{ color: colors.text, flex: 1, fontSize: 15, fontWeight: "500" }}>{album.name}</Text>
									<Ionicons name="chevron-forward" size={14} color={colors.searchPlaceholder} />
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				) : null}

				{/* Media */}
				<Text style={{ ...styles.section_label, marginTop: 22 }}>Media</Text>
				{track_ref.current?.media_uri ? (
					<View style={{ marginHorizontal: 20, marginTop: 8 }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, marginBottom: 8 }} numberOfLines={2} ellipsizeMode="middle">
							{SQLfs.media_directory(track_ref.current.media_uri)}
						</Text>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<TextInput
								style={[styles.field_input, { flex: 1, fontSize: 13, backgroundColor: "#00000025", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 0 }]}
								placeholder="-i $dl -c copy output.m4a"
								placeholderTextColor={colors.searchPlaceholder}
								autoCorrect={false}
								autoCapitalize="none"
								onChangeText={(t) => {
									ffmpeg_args_ref.current = t;
								}}
								editable={!ffmpeg_running}
							/>
							<TouchableOpacity style={{ marginLeft: 10, backgroundColor: ffmpeg_running ? "#e05555" : colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }} onPress={ffmpeg_running ? cancel_ffmpeg : run_ffmpeg}>
								<Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{ffmpeg_running ? "Cancel" : "Run"}</Text>
							</TouchableOpacity>
						</View>
						{ffmpeg_running || ffmpeg_progress > 0 ? (
							<View style={{ height: 6, backgroundColor: "#00000040", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
								<View style={{ height: "100%", width: `${ffmpeg_progress * 100}%` as any, backgroundColor: colors.primary, borderRadius: 3 }} />
							</View>
						) : null}
						{ffmpeg_log.length > 0 ? (
							<ScrollView style={{ marginTop: 8, maxHeight: 150, backgroundColor: "#00000060", borderRadius: 6, padding: 8 }} nestedScrollEnabled>
								{ffmpeg_log.map((line, i) => (
									<Text key={i} style={{ color: "#cccccc", fontSize: 10 }}>
										{line}
									</Text>
								))}
							</ScrollView>
						) : null}
					</View>
				) : (
					<View style={{ marginHorizontal: 20, marginTop: 8 }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 14 }}>No media file downloaded.</Text>
					</View>
				)}

				{/* Lyrics — only shown when the track has lyrics */}
				{track_ref.current?.lyrics_uri ? (
					<>
						<Text style={{ ...styles.section_label, marginTop: 22 }}>Lyrics</Text>
						<View style={{ marginHorizontal: 20, marginTop: 8 }}>
							<Text style={{ color: colors.searchPlaceholder, fontSize: 11, marginBottom: 8 }} numberOfLines={2} ellipsizeMode="middle">
								{SQLfs.lyrics_directory(track_ref.current.lyrics_uri)}
							</Text>
							<TouchableOpacity style={{ backgroundColor: colors.primary + "30", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
								<Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>View / Edit Lyrics</Text>
							</TouchableOpacity>
						</View>
					</>
				) : null}

				{/* Save button */}
				<TouchableOpacity
					style={{
						width: "88%",
						alignSelf: "center",
						height: 55,
						backgroundColor: colors.primary,
						borderRadius: 50,
						alignItems: "center",
						justifyContent: "center",
						marginTop: 36,
						marginBottom: 20
					}}
					onPress={save_all}
					disabled={saving_state === "LOADING"}>
					{saving_state === "LOADING" ? <ActivityIndicator size={28} color="#fff" /> : saving_state === "COMPLETE" ? <Ionicons name="checkmark" size={28} color="#fff" /> : <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Save</Text>}
				</TouchableOpacity>

				<View style={{ height: 60 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_label: {
			color: colors.text,
			marginHorizontal: 25,
			marginTop: 10,
			fontWeight: "900",
			fontSize: 18
		},
		section_label_inline: {
			color: colors.text,
			fontWeight: "900",
			fontSize: 18
		},
		field_input: {
			color: colors.text,
			fontSize: 22,
			fontWeight: "600",
			marginLeft: 25,
			marginTop: 5,
			width: "85%"
		},
		divider: {
			marginLeft: 25,
			height: 0.5,
			backgroundColor: colors.text,
			width: "85%",
			marginTop: 4
		}
	});
