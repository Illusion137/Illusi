import { ScrollView, View } from 'react-native';
import type { CompactArtist, CompactPlaylist, FullPlaylist, Track } from '@illusive/types';
import AlbumList from '@components/AlbumList';
import { GLOBALS } from '@illusive/globals';
import { useEffect, useState } from 'react';
import TrackHorizontalScrolls from '@components/TrackHorizontalScrolls';
import HorizontalRowArtists from '@components/HorizontalRowArtists';
import { get_unique_artists } from '@illusive/illusive_utils';
import { Explore } from '@illusive/explore';
import usePTheme from '@hooks/usePTheme';
import { milliseconds_of } from '@common/utils/util';
import HeaderWith from '@components/HeaderWith';
import { SQLArtists } from '@illusive/sql/sql_artists';
import IllusiRewindComponent from '@components/IllusiRewindComponent';
import { SharedRouter } from '@utils/shared_routes';
import { LinearGradient } from 'expo-linear-gradient';
import FullPlaylistList from '@components/FullPlaylistList';
import { shuffle_array } from '@common/utils/util';
import { catch_log } from '@common/utils/error_util';
import { SQLGlobal } from '@illusive/sql/sql_global';
import { load_illusi_artist_artwork } from '@illusive/get_artist';

const top_tracks_slice = 50;
const artwork_prefetch_count = 50;
const your_artists_refresh_ms = 250;

function your_artists(): CompactArtist[] {
	return SQLArtists.sort_compact_artists_by_most_played(get_unique_artists(GLOBALS.global_var.sql_tracks), GLOBALS.global_var.sql_tracks);
}

const rewind_date = new Date();
rewind_date.setMonth(10);
rewind_date.setDate(28);
const rewind_date_ms = rewind_date.getTime();
const time_till_rewind_time = Date.now() - rewind_date_ms;
const should_show_rewind = time_till_rewind_time > 0 && Date.now() <= rewind_date_ms + milliseconds_of({ months: 1 });
export default function IllusiExplore() {
	const { colors } = usePTheme();

	const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(Explore.get_new_releases);

	const [artists, set_artists] = useState<CompactArtist[]>(your_artists);
	const [forgotten_favorites, set_forgotten_favorites] = useState<CompactPlaylist[]>([]);
	const [top_tracks, set_top_tracks] = useState<Track[]>([]);
	const [for_you_playlists, set_for_you_playlists] = useState<FullPlaylist[]>([]);
	const [for_you_artists, set_for_you_artists] = useState<CompactArtist[]>([]);
	const [illusi_public_playlists, set_illusi_public_playlists] = useState<CompactPlaylist[]>([]);

	useEffect(() => {
		if (!Explore.new_releases_stale()) return;
		Explore.refresh_new_releases()
			.then(set_new_releases)
			.catch(catch_log);
	}, []);

	useEffect(() => {
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => set_artists(your_artists()), your_artists_refresh_ms);
		};
		const unsubscribe = SQLArtists.subscribe_artwork(refresh);
		SQLGlobal.push_global_sql_tracks_update_callback('illusi_explore_your_artists', refresh);
		return () => {
			clearTimeout(timeout);
			unsubscribe();
			SQLGlobal.pop_global_sql_tracks_update_callback('illusi_explore_your_artists');
		};
	}, []);

	useEffect(() => {
		load_illusi_artist_artwork(artists.slice(0, artwork_prefetch_count).map(artist => artist.name)).catch(catch_log);
	}, [artists]);

	useEffect(() => {
		(async function () {
			set_forgotten_favorites(Explore.get_forgotten_favorites());
			set_top_tracks(await Explore.get_top_tracks());
			set_for_you_playlists(await Explore.get_recommended_playlists());
			set_for_you_artists(shuffle_array(await Explore.get_recommended_artists()));
			set_illusi_public_playlists(await Explore.get_illusi_public_playlists());
		})().catch(catch_log);
	}, []);

	return (
		<ScrollView bounces={false}>
			<LinearGradient
				colors={[colors.primary, colors.background]}
				locations={[0, 0.2]}
				end={{ x: 1, y: 2 }}
				style={{ width: '100%', height: '50%', position: 'absolute', flex: 1, backgroundColor: colors.background, pointerEvents: 'box-none' }}
			/>
			<View style={{ height: 80 }} />
			{
				new_releases.length > 0 ? (
					<>
						<AlbumList second_line_type="ARTIST" title="New Releases" else_type="ALBUM" albums={new_releases} />
						<View style={{ height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center' }} />
					</>
				) : null
			}
			{for_you_playlists.length === 0 ? null : (
				<>
					<FullPlaylistList title="For You" playlists={for_you_playlists} />
					<View style={{ height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center' }} />
				</>
			)}
			{should_show_rewind ? <IllusiRewindComponent /> : null}
			<View style={{ height: 5 }} />
			{/* <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{"Your Artists"}</Text> */}
			{artists.length > 0 ? (
				<HeaderWith title="Your Artists" fullpage={() => SharedRouter.goto_shared_artist_grid('Your Artists', artists)}>
					<HorizontalRowArtists size={80} artists={artists} />
				</HeaderWith>
			)
				: null}
			{for_you_artists.length > 0 ? (
				<HeaderWith title="Recommended Artists" fullpage={() => SharedRouter.goto_shared_artist_grid('Your Artists', for_you_artists)}>
					<HorizontalRowArtists size={80} artists={for_you_artists} />
				</HeaderWith>
			)
				: null}
			<View style={{ height: 10 }} />
			{illusi_public_playlists.length > 0 ? <AlbumList title="User Playlists" second_line_type="ARTIST" else_type="ALBUM" albums={illusi_public_playlists} /> : null}
			{forgotten_favorites.length > 0 ? (
				<>
					<AlbumList title="Forgotten Favorites" second_line_type="ARTIST" else_type="SINGLE" albums={forgotten_favorites} />
				</>
			)
				: null}
			{top_tracks.length > 0 ? (
				<>
					<TrackHorizontalScrolls title={`Top ${Math.min(top_tracks.length, top_tracks_slice)} Tracks`} tracks={top_tracks.slice(0, top_tracks_slice)} height={5} />
				</>
			)
				: null}
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}
