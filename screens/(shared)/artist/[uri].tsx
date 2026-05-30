import type { IllusiveURI, MusicServiceArtist, Track } from "@illusive/types";
import { ScrollView, View, Text, TouchableOpacity, TextInput } from "react-native";
import AlbumList from "@components/AlbumList";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import LatestRelease from "@components/LatestRelease";
import { useEffect, useMemo, useState } from "react";
import { best_thumbnail, music_service_uri_to_music_service, split_uri, tracks_with_artist } from "@illusive/illusive_utils";
import { GLOBALS } from "@illusive/globals";
import { Illusive } from "@illusive/illusive";
import { is_empty, json_catch } from "@common/utils/util";
import { alert_error } from "@illusive/illusi/src/alert";
import HeaderWith from "@components/HeaderWith";
import HorizontalRowArtists from "@components/HorizontalRowArtists";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { AntDesignTouchableOpacity, IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import type { ResponseError } from "@common/types";
import { router, useLocalSearchParams } from "expo-router";
import { remove_topic } from "@common/utils/clean_util";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { reinterpret_cast } from "@common/cast";
import { Constants } from "@illusive/constants";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Artist() {
	const { uri } = useLocalSearchParams<{ uri: IllusiveURI }>();
	const { colors } = usePTheme();

	const [artist_data, set_artist_data] = useState<MusicServiceArtist>({
		name: SQLArtists.artists_memo[uri]?.name ?? "",
		albums: [],
		singles_eps: [],
		playlists: [],
		similar_artists: [],
		tracks: [],
		background_artwork_url: "",
		profile_artwork_url: SQLArtists.artists_memo[uri]?.artwork_url ?? "",
		latest_release: undefined,
		is_following: undefined,
		follow: async () => {},
		unfollow: async () => {}
	});
	const [watched, set_watched] = useState<boolean | undefined>(undefined);
	const [search_query, set_search_query] = useState<string>("");

	useEffect(() => {
		initial_data();
	}, []);

	function close() {
		router.back();
	}

	async function initial_data() {
		const cached = GLOBALS.global_var.artist_cache.get(uri);
		const cached_hit = cached !== undefined;
		if (cached_hit) {
			set_artist_data(cached.artist_data);
			if (cached.artist_data.is_following !== undefined) {
				set_watched(!cached.artist_data.is_following);
			}
			return;
		}
		const split = split_uri(uri);
		if (Illusive.music_service.get(music_service_uri_to_music_service(split[0]))?.get_artist === undefined) {
			GLOBALS.global_var.bottom_alert(`Service Artist doesn't support: ${split[0]}`, "WARN");
			close();
			return;
		}
		const artist: MusicServiceArtist | ResponseError = await Illusive.music_service.get(music_service_uri_to_music_service(split[0]))!.get_artist!(split[1]).catch(json_catch);
		if ("error" in artist) {
			alert_error(reinterpret_cast<ResponseError>(artist));
			close();
			return;
		}
		artist.tracks = SQLTracks.add_playback_saved_data_to_tracks(artist.tracks);
		set_artist_data(artist);
		if (artist.is_following !== undefined) {
			set_watched(!artist.is_following);
		}
		GLOBALS.global_var.artist_cache.add(uri, { artist_data: artist });
	}

	async function on_watch_unwatch() {
		const cached = GLOBALS.global_var.artist_cache.get(uri);
		const cached_hit = cached !== undefined;
		if (watched) {
			artist_data.unfollow();
			set_watched(false);
			if (cached_hit) cached.artist_data.is_following = false;
		} else {
			artist_data.follow();
			set_watched(true);
			if (cached_hit) cached.artist_data.is_following = true;
		}
	}

	async function play_artist() {
		const play_tracks = artist_data.tracks;
		const cloned_tracks = Illusive.shuffle_tracks("SHUFFLE", [...play_tracks]);
		GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, artist_data.name);
	}

	const shared_tracks: Track[] = tracks_with_artist(GLOBALS.global_var.sql_tracks, artist_data.name).map((track) => ({
		...track,
		downloading_data: { ...track.downloading_data!, saved: true }
	}));

	const popular_tracks = uri.includes(Constants.import_uri_id)
		? artist_data.tracks.filter((track) => track.meta?.plays).sort((a, b) => (b.meta?.plays ?? 0) - (a.meta?.plays ?? 0))
		: artist_data.tracks.filter((track) => track.plays).sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));

	const background_image_url_possibilities = [
		artist_data.profile_artwork_url,
		artist_data.background_artwork_url,
		artist_data.albums?.[0]?.artwork_url,
		artist_data.singles_eps?.[0]?.artwork_url,
		best_thumbnail(artist_data.albums?.[0]?.artwork_thumbnails)?.url,
		best_thumbnail(artist_data.singles_eps?.[0]?.artwork_thumbnails)?.url,
		artist_data.tracks?.[0]?.artwork_url
	];

	const background_image_url = background_image_url_possibilities.find((url) => !is_empty(url));

	const query_normalized = search_query.trim().toLowerCase();
	const has_query = query_normalized.length > 0;
	const match = (s: string | undefined) => (s ?? "").toLowerCase().includes(query_normalized);

	const filtered = useMemo(() => {
		if (!has_query) return null;
		return {
			tracks: artist_data.tracks.filter((t) => match(t.title) || match(t.album?.name)),
			albums: artist_data.albums.filter((a) => match(a.title?.name)),
			singles_eps: artist_data.singles_eps.filter((a) => match(a.title?.name)),
			appears_on: artist_data.appears_on?.filter((a) => match(a.title?.name)) ?? [],
			playlists: artist_data.playlists.filter((p) => match(p.title?.name)),
			similar_artists: artist_data.similar_artists.filter((a) => match(a.name?.name)),
			shared_tracks: shared_tracks.filter((t) => match(t.title) || match(t.album?.name))
		};
	}, [query_normalized, artist_data, shared_tracks]);

	return (
		<>
			<View style={{ position: "absolute", top: 60, marginHorizontal: 20, zIndex: 2, flexDirection: "row", justifyContent: "space-between" }} pointerEvents="box-none">
				<AntDesignTouchableOpacity on_press={close} style={{}} icon_name="left" icon_size={30} icon_color={colors.primary} icon_style={{}} />
			</View>
			<ScrollView bounces={false} keyboardShouldPersistTaps="handled">
				<View style={{ width: "100%", height: 320 }}>
					<IImage source={background_image_url} height={320} style={{ height: 320, resizeMode: "cover", width: "100%" }} />
					<LinearGradient colors={["transparent", "rgba(0,0,0,0.65)", colors.background]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
					<View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
						<View style={{ flex: 1, marginRight: 12 }}>
							<Text numberOfLines={2} style={{ fontSize: 36, lineHeight: 40, fontWeight: "bold", color: colors.text }}>
								{remove_topic(artist_data.name)}
							</Text>
							<Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>
								{artist_data.tracks.length === 100 ? "100+" : artist_data.tracks.length} Tracks • {artist_data.albums.length} Albums • {artist_data.singles_eps.length} Singles/EPs
							</Text>
							{artist_data.is_following !== undefined ? (
								<TouchableOpacity onPress={on_watch_unwatch} style={{ marginTop: 10, alignSelf: "flex-start", borderRadius: 40, backgroundColor: colors.text, paddingVertical: 8, paddingHorizontal: 18 }}>
									<Text style={{ color: colors.background, fontSize: 14, fontWeight: "600" }}>{watched ? "Unwatch" : "Watch"}</Text>
								</TouchableOpacity>
							) : null}
						</View>
						<IoniconsTouchableOpacity icon_name="play-circle-sharp" icon_color={colors.primary} icon_size={62} on_press={play_artist} style={{ marginLeft: 6 }} />
					</View>
				</View>

				<View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 4, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 2, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, height: 40 }}>
					<Ionicons name="search" size={16} color={colors.subtext} />
					<TextInput
						value={search_query}
						onChangeText={set_search_query}
						placeholder={`Search ${remove_topic(artist_data.name) || "artist"}`}
						placeholderTextColor={colors.subtext}
						autoCorrect={false}
						autoCapitalize="none"
						returnKeyType="search"
						style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 15, paddingVertical: 0 }}
					/>
					{has_query ? (
						<TouchableOpacity onPress={() => set_search_query("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<Ionicons name="close-circle" size={18} color={colors.subtext} />
						</TouchableOpacity>
					) : null}
				</View>

				{filtered ? (
					<>
						{filtered.tracks.length > 0 ? <TrackHorizontalScrolls title="Tracks" height={Math.min(5, Math.ceil(filtered.tracks.length / 1))} tracks={filtered.tracks} /> : null}
						<View style={{ paddingTop: 5 }} />
						{filtered.albums.length > 0 ? <AlbumList title="Albums" else_type={"ALBUM"} albums={filtered.albums} /> : null}
						<View style={{ paddingTop: 5 }} />
						{filtered.singles_eps.length > 0 ? <AlbumList title="Singles & EPs" else_type={"SINGLE"} albums={filtered.singles_eps} /> : null}
						{filtered.appears_on.length > 0 ? <AlbumList title="Appears On" else_type={"SINGLE"} albums={filtered.appears_on} /> : null}
						{filtered.playlists.length > 0 ? <AlbumList title="Playlists" else_type={"SINGLE"} albums={filtered.playlists} /> : null}
						<View style={{ paddingTop: 20 }} />
						{filtered.shared_tracks.length > 0 ? <TrackHorizontalScrolls title="From Your Library" height={Math.min(5, Math.ceil(filtered.shared_tracks.length / 1))} tracks={filtered.shared_tracks} /> : null}
						<View style={{ paddingVertical: 10 }} />
						{filtered.similar_artists.length > 0 ? (
							<HeaderWith title={"Similar Artists"}>
								<HorizontalRowArtists artists={filtered.similar_artists} />
							</HeaderWith>
						) : null}
						{filtered.tracks.length === 0 &&
						filtered.albums.length === 0 &&
						filtered.singles_eps.length === 0 &&
						filtered.appears_on.length === 0 &&
						filtered.playlists.length === 0 &&
						filtered.shared_tracks.length === 0 &&
						filtered.similar_artists.length === 0 ? (
							<View style={{ alignItems: "center", paddingVertical: 40 }}>
								<Text style={{ color: colors.subtext, fontSize: 14 }}>No matches for "{search_query}"</Text>
							</View>
						) : null}
						<View style={{ paddingVertical: 30 }} />
					</>
				) : (
					<>
						{artist_data?.latest_release ? (
							<>
								<View style={{ height: 8 }} />
								<LatestRelease album_data={artist_data?.latest_release} />
								<View style={{ paddingVertical: 5 }} />
							</>
						) : null}
						<TrackHorizontalScrolls title="Popular Tracks" height={4} tracks={popular_tracks} replace_album_with="plays" />
						<TrackHorizontalScrolls title="Tracks" height={4} tracks={artist_data.tracks} />
						<View style={{ paddingTop: 5 }} />
						{artist_data.albums.length > 0 ? <AlbumList title="Albums" else_type={"ALBUM"} albums={artist_data.albums} /> : null}
						<View style={{ paddingTop: 5 }} />
						{artist_data.singles_eps.length > 0 ? <AlbumList title="Singles & EPs" else_type={"SINGLE"} albums={artist_data.singles_eps} /> : null}
						{artist_data.appears_on !== undefined && artist_data.appears_on.length > 0 ? <AlbumList title="Appears On" else_type={"SINGLE"} albums={artist_data.appears_on} /> : null}
						{artist_data.playlists.length > 0 ? <AlbumList title="Playlists" else_type={"SINGLE"} albums={artist_data.playlists} /> : null}
						<View style={{ paddingTop: 20 }} />
						<TrackHorizontalScrolls title="From Your Library" height={5} tracks={shared_tracks} />
						<View style={{ paddingVertical: 10 }} />
						{artist_data.similar_artists.length > 0 ? (
							<HeaderWith title={"Similar Artists"}>
								<HorizontalRowArtists artists={artist_data.similar_artists} />
							</HeaderWith>
						) : null}
						<View style={{ paddingVertical: 30 }} />
					</>
				)}
			</ScrollView>
		</>
	);
}
