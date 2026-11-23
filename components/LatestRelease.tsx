import type { CompactPlaylist } from '@illusive/types';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { empty_join_dot, is_empty } from '@common/utils/util';
import usePTheme from '@hooks/usePTheme';
import IImage from './IImage';
import { SharedRouter } from '../utils/shared_routes';
import { GLOBALS } from '@illusive/globals';
import useDimensions from '@hooks/useDimensions';
import { useMemo } from 'react';
import { ContextMenuView } from '@components/ContextMenu';
import { ContextResolver } from '@utils/context_resolver';
import { AlbumContextMenu } from '@utils/context_menu';
import useMenuConfig from '@hooks/useMenuConfig';
import { catch_log } from '@common/utils/error_util';
import { Constants } from '@illusive/constants';

export default function LatestRelease(props: { album_data: CompactPlaylist }) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const card_width = useMemo(() => width - 20, [width]);
	const [menu_config, refresh_menu_config] = useMenuConfig(() => AlbumContextMenu.compact_playlist_context_menu(props.album_data), async () => ContextResolver.prefetch_album_tracks(props.album_data));

	function on_press() {
		if (props.album_data.song_track) {
			GLOBALS.global_var.play_tracks(props.album_data.song_track, [props.album_data.song_track], 'Latest Release');
		} else {
			SharedRouter.goto_shared_playlist(props.album_data.title.uri ?? '', 'URI', { fs_cache_playlist_as_album: '1' });
		}
	}

	return (
		<ContextMenuView
			isContextMenuEnabled={props.album_data.song_track ? true : !is_empty(props.album_data.title.uri)}
			menuConfig={menu_config}
			onMenuWillShow={refresh_menu_config}
			onPressMenuItem={({ nativeEvent }) => {
				ContextResolver.resolve_compact_playlist_context(props.album_data, nativeEvent.actionKey).catch(catch_log);
			}}
		>
			<TouchableOpacity onPress={on_press} onLongPress={() => {}} delayLongPress={Constants.long_press_delay} style={{ backgroundColor: colors.shelf, width: card_width, height: 90, alignSelf: 'center', borderRadius: 3, flexDirection: 'row', justifyContent: 'space-between', borderColor: colors.line, borderWidth: 1 }}>
				<View>
					<Text style={{ color: colors.subtext, fontSize: 16, fontWeight: '700', paddingLeft: 8, paddingTop: 12 }}>Latest Release</Text>
					<Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', paddingLeft: 10, paddingTop: 4 }}>{props.album_data.title.name}</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 9 }}>
						<MaterialIcons name="explicit" size={20} color={colors.secondary} style={{}} />
						<Text style={{ color: colors.subtext, fontSize: 14, fontWeight: '400', top: 1, left: 2 }}>{empty_join_dot(['Album', props.album_data.artist.map(item => item.name).join(', ')])}</Text>
					</View>
				</View>
				<IImage source={props.album_data.artwork_url} style={{ width: 70, height: 70, right: 10, borderRadius: 3, alignSelf: 'center' }} />
			</TouchableOpacity>
		</ContextMenuView>
	);
}
