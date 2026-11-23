import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { CompactPlaylist } from '@illusive/types';
import type { Track } from '@illusive/types';
import { get_album_artwork } from '@illusive/illusive_utils';
import { play } from '@illusive/play';
import { ContextMenuView } from '@components/ContextMenu';
import { useEffect, useState } from 'react';
import { Constants } from '@illusive/constants';
import usePTheme from '@hooks/usePTheme';
import { empty_join_dot, is_empty, single_case } from '@common/utils/util';
import IImage from './IImage';
import { remove_topic } from '@common/utils/clean_util';
import { SharedRouter } from '@utils/shared_routes';
import useDimensions from '@hooks/useDimensions';
import { catch_log } from '@common/utils/error_util';
import { ContextResolver } from '@utils/context_resolver';
import { AlbumContextMenu } from '@utils/context_menu';
import useMenuConfig from '@hooks/useMenuConfig';

export type SecondLineType = 'YEAR' | 'ARTIST';
export default function Album(props: { album_data: CompactPlaylist; second_line_type?: SecondLineType; size?: number; other_tracks?: Track[] }) {
	const { width } = useDimensions();
	const size = props.size ?? width * 0.4;
	const { colors } = usePTheme();

	const [target_view_node, set_target_view_node] = useState();

	const [menu_config, refresh_menu_config] = useMenuConfig(() => AlbumContextMenu.compact_playlist_context_menu(props.album_data), async () => ContextResolver.prefetch_album_tracks(props.album_data));

	useEffect(() => {
		return () => {
			set_target_view_node(undefined);
		};
	}, []);

	function on_press() {
		if (props.album_data.album_type !== 'SONG') {
			SharedRouter.goto_shared_playlist(props.album_data.title.uri ?? '', 'URI', { compact_playlist: props.album_data, fs_cache_playlist_as_album: props.album_data.type === 'ALBUM' ? '1' : '0' });
		} else if (props.album_data.song_track) {
			play(props.album_data.song_track, 'Explore', () => [props.album_data.song_track!, ...(props.other_tracks?.filter(track => track.uid !== props.album_data.song_track?.uid) ?? [])]).catch(catch_log);
		}
	}

	const year = new Date(props.album_data.date ?? 0).getFullYear();
	const artist_name = props.album_data.artist?.[0]?.name ?? props.album_data.song_track?.artists?.[0]?.name ?? '';
	const second_line = (props.second_line_type ?? 'YEAR') === 'YEAR' ? (year ?? remove_topic(artist_name)) : (remove_topic(artist_name) ?? year);

	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			previewConfig={{ targetViewNode: target_view_node }}
			isContextMenuEnabled={props.album_data.song_track ? true : !is_empty(props.album_data.title.uri)}
			menuConfig={menu_config}
			onMenuWillShow={refresh_menu_config}
			onPressMenuItem={({ nativeEvent }) => {
				ContextResolver.resolve_compact_playlist_context(props.album_data, nativeEvent.actionKey).catch(catch_log);
			}}
		>
			<TouchableOpacity style={{ padding: 5 }} onPress={on_press} onLongPress={() => {}} delayLongPress={Constants.long_press_delay}>
				<IImage source={get_album_artwork(props.album_data)} style={{ width: size, height: size, borderRadius: 2, borderWidth: 1, borderColor: colors.line }} />
				<View style={{ width: size }}>
					<Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, paddingTop: 5, width: size }} numberOfLines={1}>
						{props.album_data.title.name}
					</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						{props.album_data.explicit === 'EXPLICIT' ? <MaterialIcons name="explicit" size={18} color={colors.secondary} style={{}} /> : null}
						<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12, top: 0, width: size }}>
							{empty_join_dot([single_case(props.album_data.album_type ?? (props.second_line_type === 'ARTIST' ? String(year) : artist_name) ?? '...'), second_line])}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		</ContextMenuView>
	);
}
