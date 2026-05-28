import React, { useEffect, useState } from "react";
import {
	View, Text, StyleSheet, TouchableOpacity, FlatList,
	ActivityIndicator, ScrollView
} from "react-native";
import { Prefs } from "@illusive/prefs";
import { GLOBALS } from "@illusive/globals";
import { Illusive } from "@illusive/illusive";
import { loggedin_services } from "@illusive/sampler";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import type { CompactPlaylist, IllusiveURI, MusicServiceType } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";

function playlist_uri_to_url(service: MusicServiceType, uri: IllusiveURI): string {
	const id = uri.split(":").slice(1).join(":");
	switch (service) {
		case "YouTube Music":  return `https://music.youtube.com/playlist?list=${id}`;
		case "YouTube":        return `https://www.youtube.com/playlist?list=${id}`;
		case "Spotify":        return `https://open.spotify.com/playlist/${id}`;
		case "SoundCloud":     return decodeURIComponent(id);
		case "Amazon Music":   return `https://music.amazon.com/playlists/${id}`;
		case "Apple Music":    return `https://music.apple.com/library/playlist/${id}`;
		case "Deezer":         return `https://www.deezer.com/playlist/${id}`;
		case "Tidal":          return `https://tidal.com/browse/playlist/${id}`;
		case "Audiomack":      return `https://audiomack.com/playlist/${id}`;
		case "BandLab":        return id;
		default:               return id;
	}
}

function playlist_artwork(pl: CompactPlaylist): string | undefined {
	return pl.artwork_thumbnails?.[0]?.url ?? pl.artwork_url;
}

function playlist_key(pl: CompactPlaylist): string {
	return String(pl.title.uri ?? pl.title.name);
}

export default function ExtraServiceImporterScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { width: screen_width } = useDimensions();
	const card_size = (screen_width - 14 * 2 - 10) / 2;

	const [available_services, set_available_services] = useState<MusicServiceType[]>([]);
	const [selected_service, set_selected_service] = useState<MusicServiceType | null>(null);
	const [playlists, set_playlists] = useState<CompactPlaylist[]>([]);
	const [loading_playlists, set_loading_playlists] = useState(false);
	const [selected_keys, set_selected_keys] = useState<Set<string>>(new Set());
	const [importing, set_importing] = useState(false);
	const [import_progress, set_import_progress] = useState<{ done: number; total: number } | null>(null);

	useEffect(() => {
		const logged_in = loggedin_services();
		const with_playlists = logged_in.filter(service => {
			const ms = Illusive.music_service.get(service);
			return ms?.get_user_playlists !== undefined;
		});
		set_available_services(with_playlists);
	}, []);

	async function select_service(service: MusicServiceType) {
		set_selected_service(service);
		set_playlists([]);
		set_selected_keys(new Set());
		set_loading_playlists(true);
		try {
			const ms = Illusive.music_service.get(service)!;
			const result = await ms.get_user_playlists!();
			if ("error" in result) {
				GLOBALS.global_var.bottom_alert(`Failed to load playlists: ${result.error.message}`, "ERROR");
			} else {
				set_playlists(result.playlists);
			}
		} catch (e: unknown) {
			GLOBALS.global_var.bottom_alert(`Error loading playlists`, "ERROR");
		} finally {
			set_loading_playlists(false);
		}
	}

	function toggle_playlist(key: string) {
		set_selected_keys(prev => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	async function import_selected() {
		if (!selected_service || selected_keys.size === 0 || importing) return;

		const ms = Illusive.music_service.get(selected_service)!;
		const to_import = playlists.filter(pl => selected_keys.has(playlist_key(pl)));

		set_importing(true);
		set_import_progress({ done: 0, total: to_import.length });

		let success_count = 0;

		for (let i = 0; i < to_import.length; i++) {
			const pl = to_import[i];
			set_import_progress({ done: i, total: to_import.length });

			const uri = pl.title.uri;
			if (!uri) {
				set_import_progress({ done: i + 1, total: to_import.length });
				continue;
			}

			try {
				const url = playlist_uri_to_url(selected_service, uri);
				const playlist_result = await ms.get_playlist(url);

				if ("error" in playlist_result) continue;

				const playlist_uuid = await SQLPlaylists.create_playlist(pl.title.name);
				const playlist_tracks: { uuid: string; track_uid: string }[] = [];

				for (const track of playlist_result.tracks) {
					await SQLTracks.insert_track(track);
					playlist_tracks.push({ uuid: playlist_uuid, track_uid: track.uid });
				}

				await SQLPlaylists.insert_all_tracks_playlist(playlist_tracks);
				success_count++;
			} catch (_) {}

			set_import_progress({ done: i + 1, total: to_import.length });
		}

		set_importing(false);
		set_import_progress(null);
		set_selected_keys(new Set());

		GLOBALS.global_var.bottom_alert(
			success_count === to_import.length
				? `Imported ${success_count} playlist${success_count !== 1 ? "s" : ""}`
				: `Imported ${success_count} of ${to_import.length} playlists`,
			success_count > 0 ? "GOOD" : "WARN"
		);
	}

	if (selected_service === null) {
		return (
			<View style={{ backgroundColor: colors.background, flex: 1 }}>
				<ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
					<View style={styles.section_header}>
						<Ionicons name="cloud-download-outline" size={28} color={colors.primary} />
						<Text style={styles.section_title}>Choose a Service</Text>
					</View>
					<Text style={styles.section_subtitle}>
						Import your playlists from any connected music service.
					</Text>

					{available_services.length === 0 ? (
						<View style={styles.empty_state}>
							<Ionicons name="link-outline" size={56} color={colors.subtext} />
							<Text style={styles.empty_title}>No Services Connected</Text>
							<Text style={styles.empty_subtitle}>
								Log in to a music service in Settings to import your playlists.
							</Text>
						</View>
					) : (
						<View style={styles.service_list}>
							{available_services.map(service => {
								const ms = Illusive.music_service.get(service)!;
								return (
									<TouchableOpacity
										key={service}
										onPress={() => select_service(service)}
										style={styles.service_row}>
										<IImage
											source={ms.app_icon}
											width={40}
											style={{ width: 40, height: 40, borderRadius: 10 }}
										/>
										<Text style={styles.service_name}>{service}</Text>
										<Ionicons name="chevron-forward" size={18} color={colors.subtext} />
									</TouchableOpacity>
								);
							})}
						</View>
					)}
				</ScrollView>
			</View>
		);
	}

	const selected_ms = Illusive.music_service.get(selected_service)!;
	const selected_count = selected_keys.size;

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			{/* Header bar */}
			<View style={styles.header_row}>
				<TouchableOpacity onPress={() => set_selected_service(null)} style={styles.back_btn} disabled={importing}>
					<Ionicons name="chevron-back" size={22} color={colors.primary} />
					<Text style={[styles.back_text, { color: colors.primary }]}>Services</Text>
				</TouchableOpacity>
				<View style={styles.header_service_pill}>
					<IImage source={selected_ms.app_icon} width={20} style={{ width: 20, height: 20, borderRadius: 5 }} />
					<Text style={styles.header_service_name}>{selected_service}</Text>
				</View>
			</View>

			{loading_playlists ? (
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={{ color: colors.subtext, marginTop: 14, fontSize: 14 }}>Loading playlists…</Text>
				</View>
			) : playlists.length === 0 ? (
				<View style={styles.empty_state}>
					<Ionicons name="musical-notes-outline" size={56} color={colors.subtext} />
					<Text style={styles.empty_title}>No Playlists Found</Text>
					<Text style={styles.empty_subtitle}>This service returned no playlists for your account.</Text>
				</View>
			) : (
				<>
					<FlatList
						data={playlists}
						keyExtractor={playlist_key}
						numColumns={2}
						contentContainerStyle={{ padding: 14, paddingBottom: 100, gap: 10 }}
						columnWrapperStyle={{ gap: 10 }}
						renderItem={({ item }) => {
							const key = playlist_key(item);
							const is_selected = selected_keys.has(key);
							const artwork = playlist_artwork(item);
							return (
								<TouchableOpacity
									onPress={() => toggle_playlist(key)}
									style={[styles.playlist_card, { width: card_size }, is_selected && styles.playlist_card_selected]}
									disabled={importing}>
									<View style={{ position: "relative" }}>
										{artwork ? (
											<IImage
												source={artwork}
												width={card_size}
												style={{ width: card_size, height: card_size, borderRadius: 8 }}
											/>
										) : (
											<View style={[styles.artwork_placeholder, { width: card_size, height: card_size }]}>
												<Ionicons name="musical-notes" size={36} color={colors.subtext} />
											</View>
										)}
										{is_selected && (
											<View style={styles.checkmark_overlay}>
												<Ionicons name="checkmark-circle" size={32} color={colors.primary} />
											</View>
										)}
									</View>
									<Text style={styles.playlist_title} numberOfLines={2}>{item.title.name}</Text>
								</TouchableOpacity>
							);
						}}
					/>

					{/* Import button */}
					<View style={styles.import_footer}>
						{importing && import_progress ? (
							<View style={styles.progress_bar_bg}>
								<View
									style={[
										styles.progress_bar_fill,
										{
											backgroundColor: colors.primary,
											width: `${Math.round((import_progress.done / import_progress.total) * 100)}%`
										}
									]}
								/>
							</View>
						) : null}
						<TouchableOpacity
							onPress={import_selected}
							disabled={selected_count === 0 || importing}
							style={[
								styles.import_btn,
								{ backgroundColor: selected_count > 0 && !importing ? colors.primary : colors.shelf }
							]}>
							{importing ? (
								<>
									<ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
									<Text style={[styles.import_btn_text, { color: colors.text }]}>
										{import_progress
											? `Importing ${import_progress.done}/${import_progress.total}…`
											: "Importing…"}
									</Text>
								</>
							) : (
								<Text style={[
									styles.import_btn_text,
									{ color: selected_count > 0 ? "#fff" : colors.subtext }
								]}>
									{selected_count > 0
										? `Import ${selected_count} Playlist${selected_count !== 1 ? "s" : ""}`
										: "Select Playlists"}
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</>
			)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) => StyleSheet.create({
	section_header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 6
	},
	section_title: {
		color: colors.text,
		fontSize: 22,
		fontWeight: "800"
	},
	section_subtitle: {
		color: colors.subtext,
		fontSize: 14,
		paddingHorizontal: 16,
		marginBottom: 12,
		lineHeight: 20
	},
	service_list: {
		marginHorizontal: 14,
		backgroundColor: colors.shelf,
		borderRadius: 14,
		overflow: "hidden"
	},
	service_row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.line
	},
	service_name: {
		flex: 1,
		color: colors.text,
		fontSize: 16,
		fontWeight: "600"
	},
	header_row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.line
	},
	back_btn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		flex: 1
	},
	back_text: {
		fontSize: 16,
		fontWeight: "600"
	},
	header_service_pill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: colors.shelf,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20
	},
	header_service_name: {
		color: colors.text,
		fontSize: 13,
		fontWeight: "600"
	},
	playlist_card: {
		borderRadius: 10,
		overflow: "hidden",
		borderWidth: 2,
		borderColor: "transparent"
	},
	playlist_card_selected: {
		borderColor: colors.primary
	},
	artwork_placeholder: {
		backgroundColor: colors.shelf,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center"
	},
	checkmark_overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "#00000055",
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 8
	},
	playlist_title: {
		color: colors.text,
		fontSize: 12,
		fontWeight: "600",
		marginTop: 6,
		marginHorizontal: 2,
		marginBottom: 6,
		lineHeight: 16
	},
	import_footer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		padding: 14,
		paddingBottom: 28,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.line
	},
	progress_bar_bg: {
		height: 4,
		backgroundColor: colors.shelf,
		borderRadius: 2,
		marginBottom: 10,
		overflow: "hidden"
	},
	progress_bar_fill: {
		height: 4,
		borderRadius: 2
	},
	import_btn: {
		borderRadius: 12,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center"
	},
	import_btn_text: {
		fontSize: 16,
		fontWeight: "700"
	},
	empty_state: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 40,
		marginTop: 60
	},
	empty_title: {
		color: colors.text,
		fontSize: 20,
		fontWeight: "700",
		marginTop: 16,
		textAlign: "center"
	},
	empty_subtitle: {
		color: colors.subtext,
		fontSize: 14,
		marginTop: 10,
		textAlign: "center",
		lineHeight: 20
	}
});
