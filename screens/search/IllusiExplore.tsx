import { ScrollView, View } from "react-native";
import type { CompactPlaylist, FullPlaylist, Track } from "@illusive/types";
import AlbumList from "@components/AlbumList";
import { GLOBALS } from "@illusive/globals";
import { Prefs } from "@illusive/prefs";
import { useEffect, useRef, useState } from "react";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import HorizontalRowArtists from "@components/HorizontalRowArtists";
import { get_unique_artists } from "@illusive/illusive_utils";
import { Explore } from "@illusive/explore";
import usePTheme from "@hooks/usePTheme";
import { milliseconds_of } from "@common/utils/util";
import { SQLNewReleases } from "@illusive/sql/sql_new_releases";
import { shared_values } from "@utils/shared_values";
import HeaderWith from "@components/HeaderWith";
import { SQLArtists } from "@illusive/sql/sql_artists";
import IllusiRewindComponent from "@components/IllusiRewindComponent";
import { SharedRouter } from "@utils/shared_routes";
import { ExploreLocalData } from "@illusive/explore_local_data";
import { LinearGradient } from "expo-linear-gradient";
import FullPlaylistList from "@components/FullPlaylistList";

const top_tracks_slice = 50;
const rewind_date = new Date();
rewind_date.setMonth(10);
rewind_date.setDate(28);
const rewind_date_ms = rewind_date.getTime();
const time_till_rewind_time = Date.now() - rewind_date_ms;
const should_show_rewind = time_till_rewind_time > 0 && Date.now() <= rewind_date_ms + milliseconds_of({ months: 1 });
export default function IllusiExplore() {
	const { colors } = usePTheme();

	const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(shared_values.cached_new_releases);
	const [is_loading_new_releases, set_is_loading_new_releases] = useState<boolean>(shared_values.cached_new_releases.length === 0);

	const your_artists_ref = useRef(SQLArtists.sort_compact_artists_by_most_played(get_unique_artists(GLOBALS.global_var.sql_tracks), GLOBALS.global_var.sql_tracks));
	const [forgotten_favorites, set_forgotten_favorites] = useState<CompactPlaylist[]>([]);
	const [top_tracks, set_top_tracks] = useState<Track[]>([]);
	const [for_you_playlists, set_for_you_playlists] = useState<FullPlaylist[]>([]);
	const [illusi_public_playlists, set_illusi_public_playlists] = useState<CompactPlaylist[]>([]);

	async function get_persistant_new_releases(refreshed?: boolean) {
		if (shared_values.cached_new_releases.length !== 0 && refreshed !== true) return [];
		const not_seen_new_releases = await SQLNewReleases.get_not_seen_new_releases();
		shared_values.cached_new_releases = not_seen_new_releases;
		set_new_releases(not_seen_new_releases);
		return not_seen_new_releases;
	}

	useEffect(() => {
		(async function () {
			set_forgotten_favorites(Explore.get_forgotten_favorites());
			set_top_tracks(await Explore.get_top_tracks());
			if (shared_values.cached_new_releases.length !== 0) return;
			Explore.refresh_all_services_new_releases(get_persistant_new_releases, set_is_loading_new_releases);
			await get_persistant_new_releases();
			set_is_loading_new_releases(false);
			set_for_you_playlists(await Explore.get_recommended_playlists());
			set_illusi_public_playlists(await Explore.get_illusi_public_playlists());
		})();
	}, []);

	function on_artist_watch_progress() {}

	return (
		<ScrollView bounces={false}>
			<LinearGradient
				colors={[colors.primary, colors.background]}
				locations={[0, 0.2]}
				end={{ x: 1, y: 2 }}
				style={{ width: "100%", height: "50%", position: "absolute", flex: 1, backgroundColor: colors.background, pointerEvents: "box-none" }}
			/>
			<View style={{ height: 100 }} />
			<AlbumList
				second_line_type="ARTIST"
				is_loading={is_loading_new_releases}
				refresh={{ last_refresh: Prefs.get_pref("new_releases_last_refreshed"), refresh_data: async () => await Explore.refresh_new_releases(get_persistant_new_releases, on_artist_watch_progress) }}
				title="New Releases"
				else_type="ALBUM"
				albums={new_releases}
			/>
			<View style={{ height: 10 }} />
			<View style={{ height: 1, width: "95%", backgroundColor: colors.line, alignSelf: "center" }} />
			{for_you_playlists.length === 0 ? null : <FullPlaylistList title="For You" playlists={for_you_playlists} />}
			<View style={{ height: 1, width: "95%", backgroundColor: colors.line, alignSelf: "center" }} />
			{should_show_rewind ? <IllusiRewindComponent /> : null}
			<View style={{ height: 10 }} />
			{/* <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{"Your Artists"}</Text> */}
			{your_artists_ref.current.length > 0 ? (
				<HeaderWith title="Your Artists" fullpage={() => SharedRouter.goto_shared_artist_grid("Your Artists", your_artists_ref.current)}>
					<HorizontalRowArtists size={80} artists={your_artists_ref.current} />
				</HeaderWith>
			) : null}
			<View style={{ height: 10 }} />
			<View style={{ height: 1, width: "95%", backgroundColor: colors.line, alignSelf: "center" }} />
			{forgotten_favorites.length > 0 ? (
				<>
					<AlbumList title="Forgotten Favorites" second_line_type="ARTIST" else_type="SINGLE" albums={forgotten_favorites} />
				</>
			) : null}
			{top_tracks.length > 0 ? (
				<>
					<TrackHorizontalScrolls title={`Top ${Math.min(top_tracks.length, top_tracks_slice)} Tracks`} tracks={top_tracks.slice(0, top_tracks_slice)} height={5} />
				</>
			) : null}
			<View style={{ height: 1, width: "95%", backgroundColor: colors.line, alignSelf: "center" }} />
			<AlbumList title="Illusi Public Playlists" second_line_type="ARTIST" else_type="ALBUM" albums={illusi_public_playlists} />
			<AlbumList title="Illusi Made Playlists" second_line_type="ARTIST" else_type="ALBUM" albums={[ExploreLocalData.christmas_playlist]} />
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}
