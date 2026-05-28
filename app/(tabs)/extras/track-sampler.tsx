import React, { useCallback, useState } from "react";
import {
	View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator
} from "react-native";
import { Prefs } from "@illusive/prefs";
import { GLOBALS } from "@illusive/globals";
import { VibesSampler } from "@illusive/vibes_sampler";
import { download_track_lyrics } from "@illusive/downloader";
import { loggedin_services, unsampled_tracks_service, sample_tracks_service } from "@illusive/sampler";
import type { MusicServiceType, Track } from "@illusive/types";
import { is_empty } from "@common/utils/util";
import { artist_string } from "@illusive/illusive_utils";
import { Ionicons } from "@expo/vector-icons";
import { Illusive } from "@illusive/illusive";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

const CHUNK_SIZE = 10;

function chunk_array<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
	return chunks;
}

type BatchProgress = { done: number; total: number };

export default function ExtraTrackSamplerScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [tab_index, set_tab_index] = useState<0 | 1 | 2>(0);

	// Vibes state
	const [vibes_running, set_vibes_running] = useState(false);
	const [vibes_progress, set_vibes_progress] = useState<BatchProgress | null>(null);
	const [vibes_single_running, set_vibes_single_running] = useState<Set<string>>(new Set());
	const [vibes_done_uids, set_vibes_done_uids] = useState<Set<string>>(new Set());

	// Lyrics state
	const [lyrics_running, set_lyrics_running] = useState(false);
	const [lyrics_progress, set_lyrics_progress] = useState<BatchProgress | null>(null);
	const [lyrics_single_running, set_lyrics_single_running] = useState<Set<string>>(new Set());
	const [lyrics_done_uids, set_lyrics_done_uids] = useState<Set<string>>(new Set());

	// Services state
	const [service_running, set_service_running] = useState<MusicServiceType | null>(null);
	const [service_progress, set_service_progress] = useState<BatchProgress | null>(null);

	// Derived track lists
	const unvibed_tracks = GLOBALS.global_var.sql_tracks.filter(
		t => (!t.acousticness || t.acousticness === 0) && !vibes_done_uids.has(t.uid)
	);
	const unlyrics_tracks = GLOBALS.global_var.sql_tracks.filter(
		t => is_empty(t.lyrics_uri) && is_empty(t.synced_lyrics_uri) && !lyrics_done_uids.has(t.uid)
	);

	const logged_in_services = loggedin_services().filter(s => {
		const ms = Illusive.music_service.get(s);
		return ms !== undefined;
	});

	// ─── Vibes ────────────────────────────────────────────────────

	async function sample_all_vibes() {
		if (vibes_running) return;
		const tracks = GLOBALS.global_var.sql_tracks.filter(
			t => !t.acousticness || t.acousticness === 0
		);
		if (tracks.length === 0) return;
		set_vibes_running(true);
		set_vibes_progress({ done: 0, total: tracks.length });
		const done_uids: string[] = [];
		for (let i = 0; i < tracks.length; i++) {
			try { await VibesSampler.predict_track_save_result(tracks[i]); done_uids.push(tracks[i].uid); } catch (_) {}
			set_vibes_progress({ done: i + 1, total: tracks.length });
		}
		set_vibes_done_uids(prev => new Set([...prev, ...done_uids]));
		set_vibes_running(false);
		set_vibes_progress(null);
		GLOBALS.global_var.bottom_alert(`Sampled vibes for ${done_uids.length} track${done_uids.length !== 1 ? "s" : ""}`, "GOOD");
	}

	async function sample_single_vibes(track: Track) {
		if (vibes_single_running.has(track.uid)) return;
		set_vibes_single_running(prev => new Set([...prev, track.uid]));
		try {
			await VibesSampler.predict_track_save_result(track);
			set_vibes_done_uids(prev => new Set([...prev, track.uid]));
		} catch (_) {}
		set_vibes_single_running(prev => { const n = new Set(prev); n.delete(track.uid); return n; });
	}

	// ─── Lyrics ───────────────────────────────────────────────────

	async function fetch_all_lyrics() {
		if (lyrics_running) return;
		const tracks = GLOBALS.global_var.sql_tracks.filter(
			t => is_empty(t.lyrics_uri) && is_empty(t.synced_lyrics_uri)
		);
		if (tracks.length === 0) return;
		set_lyrics_running(true);
		set_lyrics_progress({ done: 0, total: tracks.length });
		const done_uids: string[] = [];
		for (let i = 0; i < tracks.length; i++) {
			try { await download_track_lyrics(tracks[i]); done_uids.push(tracks[i].uid); } catch (_) {}
			set_lyrics_progress({ done: i + 1, total: tracks.length });
		}
		set_lyrics_done_uids(prev => new Set([...prev, ...done_uids]));
		set_lyrics_running(false);
		set_lyrics_progress(null);
		GLOBALS.global_var.bottom_alert(`Fetched lyrics for ${done_uids.length} track${done_uids.length !== 1 ? "s" : ""}`, "GOOD");
	}

	async function fetch_single_lyrics(track: Track) {
		if (lyrics_single_running.has(track.uid)) return;
		set_lyrics_single_running(prev => new Set([...prev, track.uid]));
		try {
			await download_track_lyrics(track);
			set_lyrics_done_uids(prev => new Set([...prev, track.uid]));
		} catch (_) {}
		set_lyrics_single_running(prev => { const n = new Set(prev); n.delete(track.uid); return n; });
	}

	// ─── Services ─────────────────────────────────────────────────

	async function convert_service(service: MusicServiceType) {
		if (service_running !== null) return;
		const tracks = unsampled_tracks_service(service, GLOBALS.global_var.sql_tracks);
		if (tracks.length === 0) return;
		set_service_running(service);
		set_service_progress({ done: 0, total: tracks.length });
		const chunks = chunk_array(tracks, CHUNK_SIZE);
		let done = 0;
		for (const chunk of chunks) {
			try { await sample_tracks_service(chunk, service); } catch (_) {}
			done += chunk.length;
			set_service_progress({ done, total: tracks.length });
		}
		set_service_running(null);
		set_service_progress(null);
		GLOBALS.global_var.bottom_alert(`Converted ${done} track${done !== 1 ? "s" : ""} to ${service}`, "GOOD");
	}

	// ─── Render helpers ───────────────────────────────────────────

	const render_track_row_vibes = useCallback(({ item }: { item: Track }) => {
		const artwork = item.playback?.artwork ?? item.artwork_url;
		const running = vibes_single_running.has(item.uid);
		return (
			<View style={styles.track_row}>
				{artwork
					? <IImage source={artwork} width={44} style={{ width: 44, height: 44, borderRadius: 8 }} />
					: <View style={[styles.artwork_ph, { width: 44, height: 44 }]}><Ionicons name="musical-note" size={20} color={colors.subtext} /></View>
				}
				<View style={{ flex: 1, marginLeft: 10 }}>
					<Text style={styles.track_title} numberOfLines={1}>{item.title}</Text>
					<Text style={styles.track_artist} numberOfLines={1}>{artist_string(item)}</Text>
				</View>
				<TouchableOpacity
					onPress={() => sample_single_vibes(item)}
					disabled={running || vibes_running}
					style={[styles.small_btn, { backgroundColor: colors.shelf }]}>
					{running
						? <ActivityIndicator size="small" color={colors.primary} />
						: <Text style={[styles.small_btn_text, { color: colors.primary }]}>Sample</Text>
					}
				</TouchableOpacity>
			</View>
		);
	}, [vibes_single_running, vibes_running, colors]);

	const render_track_row_lyrics = useCallback(({ item }: { item: Track }) => {
		const artwork = item.playback?.artwork ?? item.artwork_url;
		const running = lyrics_single_running.has(item.uid);
		return (
			<View style={styles.track_row}>
				{artwork
					? <IImage source={artwork} width={44} style={{ width: 44, height: 44, borderRadius: 8 }} />
					: <View style={[styles.artwork_ph, { width: 44, height: 44 }]}><Ionicons name="musical-note" size={20} color={colors.subtext} /></View>
				}
				<View style={{ flex: 1, marginLeft: 10 }}>
					<Text style={styles.track_title} numberOfLines={1}>{item.title}</Text>
					<Text style={styles.track_artist} numberOfLines={1}>{artist_string(item)}</Text>
				</View>
				<TouchableOpacity
					onPress={() => fetch_single_lyrics(item)}
					disabled={running || lyrics_running}
					style={[styles.small_btn, { backgroundColor: colors.shelf }]}>
					{running
						? <ActivityIndicator size="small" color={colors.primary} />
						: <Text style={[styles.small_btn_text, { color: colors.primary }]}>Fetch</Text>
					}
				</TouchableOpacity>
			</View>
		);
	}, [lyrics_single_running, lyrics_running, colors]);

	// ─── Tab content ──────────────────────────────────────────────

	function render_vibes_tab() {
		return (
			<>
				<View style={styles.tab_action_row}>
					<View style={{ flex: 1 }}>
						<Text style={styles.count_label}>
							{unvibed_tracks.length} track{unvibed_tracks.length !== 1 ? "s" : ""} without vibes
						</Text>
						{vibes_progress && (
							<View style={styles.progress_bar_bg}>
								<View style={[styles.progress_bar_fill, {
									backgroundColor: colors.primary,
									width: `${Math.round((vibes_progress.done / vibes_progress.total) * 100)}%`
								}]} />
							</View>
						)}
					</View>
					<TouchableOpacity
						onPress={sample_all_vibes}
						disabled={vibes_running || unvibed_tracks.length === 0}
						style={[styles.action_btn, { backgroundColor: unvibed_tracks.length > 0 && !vibes_running ? colors.primary : colors.shelf }]}>
						{vibes_running
							? <ActivityIndicator size="small" color={colors.text} />
							: <Text style={[styles.action_btn_text, { color: unvibed_tracks.length > 0 ? "#fff" : colors.subtext }]}>
								Sample All
							</Text>
						}
					</TouchableOpacity>
				</View>
				<FlatList
					data={unvibed_tracks}
					keyExtractor={t => t.uid}
					renderItem={render_track_row_vibes}
					contentContainerStyle={{ paddingBottom: 32 }}
					ListEmptyComponent={
						<View style={styles.empty_state}>
							<Ionicons name="checkmark-circle-outline" size={48} color={colors.green} />
							<Text style={styles.empty_label}>All tracks have vibes data</Text>
						</View>
					}
				/>
			</>
		);
	}

	function render_lyrics_tab() {
		return (
			<>
				<View style={styles.tab_action_row}>
					<View style={{ flex: 1 }}>
						<Text style={styles.count_label}>
							{unlyrics_tracks.length} track{unlyrics_tracks.length !== 1 ? "s" : ""} without lyrics
						</Text>
						{lyrics_progress && (
							<View style={styles.progress_bar_bg}>
								<View style={[styles.progress_bar_fill, {
									backgroundColor: colors.primary,
									width: `${Math.round((lyrics_progress.done / lyrics_progress.total) * 100)}%`
								}]} />
							</View>
						)}
					</View>
					<TouchableOpacity
						onPress={fetch_all_lyrics}
						disabled={lyrics_running || unlyrics_tracks.length === 0}
						style={[styles.action_btn, { backgroundColor: unlyrics_tracks.length > 0 && !lyrics_running ? colors.primary : colors.shelf }]}>
						{lyrics_running
							? <ActivityIndicator size="small" color={colors.text} />
							: <Text style={[styles.action_btn_text, { color: unlyrics_tracks.length > 0 ? "#fff" : colors.subtext }]}>
								Fetch All
							</Text>
						}
					</TouchableOpacity>
				</View>
				<FlatList
					data={unlyrics_tracks}
					keyExtractor={t => t.uid}
					renderItem={render_track_row_lyrics}
					contentContainerStyle={{ paddingBottom: 32 }}
					ListEmptyComponent={
						<View style={styles.empty_state}>
							<Ionicons name="checkmark-circle-outline" size={48} color={colors.green} />
							<Text style={styles.empty_label}>All tracks have lyrics</Text>
						</View>
					}
				/>
			</>
		);
	}

	function render_services_tab() {
		if (logged_in_services.length === 0) {
			return (
				<View style={styles.empty_state}>
					<Ionicons name="link-outline" size={56} color={colors.subtext} />
					<Text style={[styles.empty_label, { fontSize: 16, marginTop: 12 }]}>No Services Connected</Text>
					<Text style={[styles.empty_label, { marginTop: 6, fontSize: 13 }]}>
						Log in to a music service in Settings to start converting tracks.
					</Text>
				</View>
			);
		}

		return (
			<FlatList
				data={logged_in_services}
				keyExtractor={s => s}
				contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 32 }}
				renderItem={({ item: service }) => {
					const ms = Illusive.music_service.get(service)!;
					const unsampled = unsampled_tracks_service(service, GLOBALS.global_var.sql_tracks);
					const is_this_running = service_running === service;
					const is_other_running = service_running !== null && !is_this_running;

					return (
						<View style={styles.service_card}>
							<View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
								<IImage
									source={ms.app_icon}
									width={40}
									style={{ width: 40, height: 40, borderRadius: 10 }}
								/>
								<View style={{ flex: 1 }}>
									<Text style={styles.service_name}>{service}</Text>
									<Text style={styles.service_count}>
										{unsampled.length} track{unsampled.length !== 1 ? "s" : ""} to convert
									</Text>
									{is_this_running && service_progress && (
										<View style={[styles.progress_bar_bg, { marginTop: 6 }]}>
											<View style={[styles.progress_bar_fill, {
												backgroundColor: colors.primary,
												width: `${Math.round((service_progress.done / service_progress.total) * 100)}%`
											}]} />
										</View>
									)}
								</View>
							</View>
							<TouchableOpacity
								onPress={() => convert_service(service)}
								disabled={unsampled.length === 0 || is_this_running || is_other_running}
								style={[
									styles.small_btn,
									{
										backgroundColor: unsampled.length > 0 && !is_this_running && !is_other_running
											? colors.primary
											: colors.shelf
									}
								]}>
								{is_this_running
									? <ActivityIndicator size="small" color={colors.text} />
									: <Text style={[
										styles.small_btn_text,
										{ color: unsampled.length > 0 && !is_other_running ? "#fff" : colors.subtext }
									]}>
										Convert
									</Text>
								}
							</TouchableOpacity>
						</View>
					);
				}}
			/>
		);
	}

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			<SegmentedControl
				values={["Vibes", "Lyrics", "Services"]}
				selectedIndex={tab_index}
				fontStyle={{ color: colors.text }}
				activeFontStyle={{ color: colors.primary }}
				onChange={e => set_tab_index(e.nativeEvent.selectedSegmentIndex as 0 | 1 | 2)}
				style={{ marginHorizontal: 14, marginTop: 12, marginBottom: 4 }}
			/>
			{tab_index === 0 && render_vibes_tab()}
			{tab_index === 1 && render_lyrics_tab()}
			{tab_index === 2 && render_services_tab()}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) => StyleSheet.create({
	tab_action_row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.line
	},
	count_label: {
		color: colors.subtext,
		fontSize: 13,
		fontWeight: "500"
	},
	progress_bar_bg: {
		height: 4,
		backgroundColor: colors.track,
		borderRadius: 2,
		marginTop: 6,
		overflow: "hidden"
	},
	progress_bar_fill: {
		height: 4,
		borderRadius: 2
	},
	action_btn: {
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 10,
		minWidth: 96,
		alignItems: "center",
		justifyContent: "center"
	},
	action_btn_text: {
		fontSize: 14,
		fontWeight: "700"
	},
	track_row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.line
	},
	track_title: {
		color: colors.text,
		fontSize: 14,
		fontWeight: "600"
	},
	track_artist: {
		color: colors.subtext,
		fontSize: 12,
		marginTop: 2
	},
	artwork_ph: {
		backgroundColor: colors.shelf,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center"
	},
	small_btn: {
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 7,
		minWidth: 68,
		alignItems: "center",
		justifyContent: "center"
	},
	small_btn_text: {
		fontSize: 13,
		fontWeight: "600"
	},
	service_card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		backgroundColor: colors.shelf,
		borderRadius: 14,
		padding: 14
	},
	service_name: {
		color: colors.text,
		fontSize: 15,
		fontWeight: "700"
	},
	service_count: {
		color: colors.subtext,
		fontSize: 13,
		marginTop: 2
	},
	empty_state: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 60,
		paddingHorizontal: 32
	},
	empty_label: {
		color: colors.subtext,
		fontSize: 14,
		textAlign: "center"
	}
});
