import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, Switch } from "react-native";
import type { Prefs } from "@illusive/prefs";
import { P2P, type PeerInfo, type TrackInfoCmd, type P2PStatus } from "@illusive/p2p";
import { GLOBALS } from "@illusive/globals";
import { is_empty } from "@common/utils/util";
import { artist_string } from "@illusive/illusive_utils";
import { Ionicons } from "@expo/vector-icons";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import TrackPlayer, { State } from "react-native-track-player";
import type { Track } from "@illusive/types";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from "react-native-reanimated";

export default function ExtraSyncPlayScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [status, set_status] = useState<P2PStatus>(P2P.get_status());
	const [role_index, set_role_index] = useState<0 | 1>(P2P.get_role() === "guest" ? 1 : 0);
	const [connected_peers, set_connected_peers] = useState<PeerInfo[]>(P2P.get_connected_peers());
	const [discovered_peers, set_discovered_peers] = useState<PeerInfo[]>(P2P.get_discovered_peers());
	const [browse_state, set_browse_state] = useState<"idle" | "browsing" | "connecting" | "connected">(P2P.is_connected() && P2P.get_role() === "guest" ? "connected" : "idle");
	const [host_track_info, set_host_track_info] = useState<TrackInfoCmd | null>(null);
	const [current_track, set_current_track] = useState<Track | null>(GLOBALS.global_var.playing_tracks[GLOBALS.global_var.playing_track_index] ?? null);
	const [guest_can_control_pref, set_guest_can_control_pref] = useState(P2P.get_status().guest_can_control);

	const connect_check_ref = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		return P2P.subscribe_status((s) => {
			set_status(s);
			set_connected_peers(P2P.get_connected_peers());
			set_guest_can_control_pref(s.guest_can_control);
			if (s.role === "guest" && s.connected) set_browse_state("connected");
			if (!s.connected && browse_state === "connected") set_browse_state("idle");
		});
	}, [browse_state]);

	useEffect(() => {
		if (P2P.get_role() === "guest" && P2P.is_connected()) {
			rebind_guest_callbacks();
		}
	}, []);

	const pulse_scale = useSharedValue(1);
	useEffect(() => {
		const is_hosting_and_active = status.role === "host" && connected_peers.length > 0;
		if (is_hosting_and_active) {
			pulse_scale.value = withRepeat(withSequence(withTiming(1.45, { duration: 600 }), withTiming(1.0, { duration: 600 })), -1, false);
		} else {
			pulse_scale.value = withTiming(1, { duration: 200 });
		}
	}, [status.role, connected_peers.length]);

	const pulse_style = useAnimatedStyle(() => ({ transform: [{ scale: pulse_scale.value }] }));

	useEffect(() => {
		const interval = setInterval(() => {
			const idx = GLOBALS.global_var.playing_track_index;
			const track = GLOBALS.global_var.playing_tracks[idx] ?? null;
			set_current_track(track);
			if (status.role === "host" && track) {
				TrackPlayer.getProgress()
					.then((p) => {
						TrackPlayer.getPlaybackState()
							.then(({ state }) => {
								P2P.broadcast_track_info(track, p.position, state === State.Playing);
							})
							.catch(() => {});
					})
					.catch(() => {});
			}
		}, 2000);
		return () => clearInterval(interval);
	}, [status.role]);

	function start_session() {
		P2P.broadcast({
			on_guest_connected: (peer) => {
				set_connected_peers((prev) => (prev.some((p) => p.peerId === peer.peerId) ? prev : [...prev, peer]));
			},
			on_guest_disconnected: (peer_id) => {
				set_connected_peers((prev) => prev.filter((p) => p.peerId !== peer_id));
			}
		});
		set_connected_peers([]);
	}

	function stop_session() {
		P2P.disconnect();
		set_connected_peers([]);
	}

	function rebind_guest_callbacks() {
		P2P.browse({
			on_peer_found: (peer) => {
				set_discovered_peers((prev) => (prev.some((p) => p.peerId === peer.peerId) ? prev : [...prev, peer]));
			},
			on_peer_lost: (peer_id) => {
				set_discovered_peers((prev) => prev.filter((p) => p.peerId !== peer_id));
			},
			on_track_info: (info) => {
				set_host_track_info(info);
			}
		});
	}

	function start_browsing() {
		set_browse_state("browsing");
		set_discovered_peers([]);
		set_host_track_info(null);
		rebind_guest_callbacks();
	}

	function join_host(peer_id: string) {
		set_browse_state("connecting");
		P2P.invite(peer_id);
		if (connect_check_ref.current) clearInterval(connect_check_ref.current);
		connect_check_ref.current = setInterval(() => {
			if (P2P.is_connected()) {
				clearInterval(connect_check_ref.current!);
				connect_check_ref.current = null;
				set_browse_state("connected");
			}
		}, 500);
	}

	function disconnect_guest() {
		P2P.disconnect();
		if (connect_check_ref.current) {
			clearInterval(connect_check_ref.current);
			connect_check_ref.current = null;
		}
		set_browse_state("idle");
		set_host_track_info(null);
		set_discovered_peers([]);
	}

	function switch_role(idx: 0 | 1) {
		P2P.disconnect();
		if (connect_check_ref.current) {
			clearInterval(connect_check_ref.current);
			connect_check_ref.current = null;
		}
		set_role_index(idx);
		set_connected_peers([]);
		set_discovered_peers([]);
		set_host_track_info(null);
		set_browse_state("idle");
	}

	function toggle_guest_can_control(allow: boolean) {
		set_guest_can_control_pref(allow);
		P2P.set_guest_can_control(allow);
	}

	const track_in_library = host_track_info
		? GLOBALS.global_var.sql_tracks.some(
				(t) =>
					(!is_empty(host_track_info.youtube_id) && t.youtube_id === host_track_info.youtube_id) ||
					(!is_empty(host_track_info.youtubemusic_id) && t.youtubemusic_id === host_track_info.youtubemusic_id) ||
					(host_track_info.soundcloud_id !== undefined && t.soundcloud_id === host_track_info.soundcloud_id) ||
					(!is_empty(host_track_info.spotify_id) && t.spotify_id === host_track_info.spotify_id) ||
					(!is_empty(host_track_info.soundcloud_permalink) && t.soundcloud_permalink === host_track_info.soundcloud_permalink)
			)
		: true;

	function render_current_track_card() {
		if (!current_track) return null;
		const artwork = current_track.playback?.artwork;
		return (
			<View style={styles.track_card}>
				<IImage source={artwork} width={52} style={{ borderRadius: 2, height: 52, borderWidth: 1, borderColor: colors.line }} />
				<View style={{ flex: 1, marginLeft: 12 }}>
					<Text style={styles.track_title} numberOfLines={1}>
						{current_track.title}
					</Text>
					<Text style={styles.track_artist} numberOfLines={1}>
						{artist_string(current_track)}
					</Text>
				</View>
				<Ionicons name="musical-note" size={18} color={colors.primary} />
			</View>
		);
	}

	function render_host_track_info_card() {
		if (!host_track_info) return null;
		return (
			<View style={styles.track_card}>
				{host_track_info.artwork_url ? (
					<IImage source={host_track_info.artwork_url} width={52} style={{ borderRadius: 8, height: 2, borderWidth: 1, borderColor: colors.line }} />
				) : (
					<View style={[styles.artwork_placeholder, { width: 52, height: 52 }]}>
						<Ionicons name="musical-note" size={24} color={colors.subtext} />
					</View>
				)}
				<View style={{ flex: 1, marginLeft: 12 }}>
					<Text style={styles.track_title} numberOfLines={1}>
						{host_track_info.title}
					</Text>
					<Text style={styles.track_artist} numberOfLines={1}>
						{host_track_info.artists_str}
					</Text>
					{!track_in_library && (
						<View style={styles.warning_chip}>
							<Ionicons name="cloud-download-outline" size={12} color={colors.orange} />
							<Text style={styles.warning_text}>Not in library — streaming from source</Text>
						</View>
					)}
				</View>
			</View>
		);
	}

	const is_hosting = status.role === "host";

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			{/* Header */}
			<View style={styles.header_row}>
				<Ionicons name="sync-circle-outline" size={30} color={colors.primary} />
				<Text style={styles.page_title}>SyncPlay</Text>
				{status.connected && (
					<View style={[styles.persist_chip, { backgroundColor: colors.shelf, borderColor: colors.line }]}>
						<Ionicons name="link" size={11} color={colors.green} />
						<Text style={[styles.persist_text, { color: colors.subtext }]}>Stays connected when you leave</Text>
					</View>
				)}
			</View>

			{/* Role toggle */}
			<SegmentedControl
				values={["Host", "Guest"]}
				selectedIndex={role_index}
				fontStyle={{ color: colors.text }}
				activeFontStyle={{ color: colors.primary }}
				onChange={(e) => switch_role(e.nativeEvent.selectedSegmentIndex as 0 | 1)}
				style={{ marginHorizontal: 14, marginTop: 10, marginBottom: 6 }}
			/>

			{/* Host view */}
			{role_index === 0 && (
				<View style={{ flex: 1, paddingHorizontal: 14 }}>
					<TouchableOpacity onPress={is_hosting ? stop_session : start_session} style={[styles.action_btn, { backgroundColor: is_hosting ? colors.red : colors.primary, marginTop: 16 }]}>
						<Text style={styles.action_btn_text}>{is_hosting ? "Stop Session" : "Start Session"}</Text>
					</TouchableOpacity>

					{is_hosting && (
						<View style={styles.status_row}>
							<Animated.View style={pulse_style}>
								<View style={[styles.status_dot, { backgroundColor: status.waiting_for_guests ? colors.orange : colors.green }]} />
							</Animated.View>
							<Text style={[styles.status_text, { color: status.waiting_for_guests ? colors.orange : colors.green }]}>
								{status.waiting_for_guests ? "Waiting for guests to load…" : `Hosting • ${connected_peers.length} listener${connected_peers.length !== 1 ? "s" : ""}`}
							</Text>
						</View>
					)}

					{is_hosting && (
						<View style={[styles.permission_row, { backgroundColor: colors.shelf, borderColor: colors.line }]}>
							<View style={{ flex: 1 }}>
								<Text style={[styles.permission_title, { color: colors.text }]}>Guests can control playback</Text>
								<Text style={[styles.permission_sub, { color: colors.subtext }]}>{guest_can_control_pref ? "Guests can play, pause, seek, and skip" : "Guests can only listen along"}</Text>
							</View>
							<Switch value={guest_can_control_pref} onValueChange={toggle_guest_can_control} trackColor={{ true: colors.primary, false: colors.line }} />
						</View>
					)}

					{is_hosting && current_track && (
						<View style={{ marginTop: 12 }}>
							<Text style={styles.section_label}>NOW PLAYING</Text>
							{render_current_track_card()}
						</View>
					)}

					{is_hosting && (
						<View style={{ marginTop: 16 }}>
							<Text style={styles.section_label}>LISTENERS</Text>
							<FlatList
								data={connected_peers}
								keyExtractor={(p) => p.peerId}
								scrollEnabled={false}
								renderItem={({ item }) => (
									<View style={styles.peer_row}>
										<Ionicons name="person-circle-outline" size={28} color={colors.subtext} />
										<Text style={styles.peer_name}>{item.displayName || item.peerId}</Text>
									</View>
								)}
								ListEmptyComponent={<Text style={styles.empty_label}>No guests connected yet</Text>}
							/>
						</View>
					)}
				</View>
			)}

			{/* Guest view */}
			{role_index === 1 && (
				<View style={{ flex: 1, paddingHorizontal: 14 }}>
					{browse_state === "idle" && (
						<TouchableOpacity onPress={start_browsing} style={[styles.action_btn, { backgroundColor: colors.primary, marginTop: 16 }]}>
							<Text style={styles.action_btn_text}>Scan for Hosts</Text>
						</TouchableOpacity>
					)}

					{browse_state === "browsing" && (
						<>
							<View style={styles.status_row}>
								<ActivityIndicator size="small" color={colors.primary} />
								<Text style={[styles.status_text, { color: colors.subtext }]}>Scanning for nearby hosts…</Text>
							</View>
							<FlatList
								data={discovered_peers}
								keyExtractor={(p) => p.peerId}
								scrollEnabled={false}
								renderItem={({ item }) => (
									<View style={styles.peer_row}>
										<Ionicons name="wifi" size={22} color={colors.subtext} />
										<Text style={[styles.peer_name, { flex: 1 }]}>{item.displayName || item.peerId}</Text>
										<TouchableOpacity onPress={() => join_host(item.peerId)} style={styles.join_btn}>
											<Text style={[styles.join_btn_text, { color: colors.primary }]}>Join</Text>
										</TouchableOpacity>
									</View>
								)}
								ListEmptyComponent={<Text style={styles.empty_label}>No hosts found nearby yet…</Text>}
							/>
						</>
					)}

					{browse_state === "connecting" && (
						<View style={styles.status_row}>
							<ActivityIndicator size="small" color={colors.primary} />
							<Text style={[styles.status_text, { color: colors.subtext }]}>Connecting…</Text>
						</View>
					)}

					{browse_state === "connected" && (
						<>
							<View style={styles.status_row}>
								<Ionicons name="checkmark-circle" size={20} color={colors.green} />
								<Text style={[styles.status_text, { color: colors.green }]}>Connected</Text>
							</View>

							<View style={[styles.permission_row, { backgroundColor: colors.shelf, borderColor: colors.line, marginTop: 12 }]}>
								<Ionicons name={status.guest_can_control ? "lock-open-outline" : "lock-closed-outline"} size={20} color={status.guest_can_control ? colors.green : colors.orange} />
								<View style={{ flex: 1, marginLeft: 10 }}>
									<Text style={[styles.permission_title, { color: colors.text }]}>{status.guest_can_control ? "Controls unlocked" : "Listen-only mode"}</Text>
									<Text style={[styles.permission_sub, { color: colors.subtext }]}>{status.guest_can_control ? "You can play, pause, seek, skip" : "Host hasn't granted control"}</Text>
								</View>
							</View>

							{host_track_info && (
								<View style={{ marginTop: 12 }}>
									<Text style={styles.section_label}>HOST IS PLAYING</Text>
									{render_host_track_info_card()}
								</View>
							)}

							<TouchableOpacity onPress={disconnect_guest} style={[styles.action_btn, { backgroundColor: colors.red, marginTop: 20 }]}>
								<Text style={styles.action_btn_text}>Disconnect</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		header_row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexWrap: "wrap" },
		page_title: { color: colors.text, fontSize: 24, fontWeight: "800" },
		persist_chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginLeft: 6 },
		persist_text: { fontSize: 10, fontWeight: "600" },
		status_row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
		status_dot: { width: 12, height: 12, borderRadius: 6 },
		status_text: { fontSize: 14, fontWeight: "600" },
		action_btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
		action_btn_text: { color: "#fff", fontSize: 16, fontWeight: "700" },
		section_label: { color: colors.subtext, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8 },
		track_card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.shelf, borderRadius: 12, padding: 12 },
		track_title: { color: colors.text, fontSize: 15, fontWeight: "600" },
		track_artist: { color: colors.subtext, fontSize: 13, marginTop: 2 },
		artwork_placeholder: { backgroundColor: colors.track, borderRadius: 8, justifyContent: "center", alignItems: "center" },
		warning_chip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, backgroundColor: colors.track, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
		warning_text: { color: colors.orange, fontSize: 11, fontWeight: "500" },
		peer_row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
		peer_name: { color: colors.text, fontSize: 15 },
		join_btn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.shelf, borderRadius: 8 },
		join_btn_text: { fontSize: 14, fontWeight: "600" },
		empty_label: { color: colors.subtext, fontSize: 14, marginTop: 16, textAlign: "center" },
		permission_row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
		permission_title: { fontSize: 14, fontWeight: "700" },
		permission_sub: { fontSize: 12, marginTop: 2 }
	});
