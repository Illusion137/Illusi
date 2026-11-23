import { View, Text, TouchableHighlight, StyleSheet } from 'react-native';
import type { Track } from '@illusive/types';
import type { Prefs } from '@illusive/prefs';
import { useMemo } from 'react';
import FourTrackArtwork from './FourTrackArtwork';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { ContextMenuView } from '@components/ContextMenu';
import { Constants } from '@illusive/constants';
import usePTheme from '@hooks/usePTheme';
import { ContextResolver } from '@utils/context_resolver';
import { TracksListContextMenu } from '@utils/context_menu';
import useMenuConfig from '@hooks/useMenuConfig';
import { reinterpret_cast } from '@common/cast';
import { SharedRouter } from '@utils/shared_routes';
import useDimensions from '@hooks/useDimensions';
import { catch_log } from '@common/utils/error_util';
export default function DefaultPlaylistComponent(props: { four_track: Track[]; title: string; force_order?: boolean }) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const item_size = useMemo(() => width * 0.29, [width]);
	const styles = useMemo(() => theme_styles(colors, item_size), [colors, item_size]);

	const [menu_config, refresh_menu_config] = useMenuConfig(() => TracksListContextMenu.tracks_list_context_menu(props.title));

	async function navigate() {
		SharedRouter.goto_shared_playlist(props.title, 'DEFAULT_PLAYLIST', { force_order: props.force_order ? '1' : '0' });
	}

	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			menuConfig={menu_config}
			onMenuWillShow={refresh_menu_config}
			onPressMenuItem={({ nativeEvent }) => {
				ContextResolver.resolve_tracks_list_context(props.title, async () => SQLPlaylists.playlist_tracks(props.title), reinterpret_cast<ContextResolver.TracksListContextKeys>(nativeEvent.actionKey)).catch(catch_log);
			}}
		>
			<TouchableHighlight onLongPress={() => {}} delayLongPress={Constants.long_press_delay} style={styles.default_playlist_button} onPress={navigate}>
				<View style={{ justifyContent: 'center', alignItems: 'center' }}>
					<Text style={styles.default_playlist_text}>{props.title}</Text>
					<FourTrackArtwork four_track={props.four_track} size={item_size / 2} dim={true} />
				</View>
			</TouchableHighlight>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors'], item_size: number) =>
	StyleSheet.create({
		default_playlist_text: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', position: 'absolute', zIndex: 1 },
		default_playlist_button: { backgroundColor: colors.card, height: item_size, width: item_size, borderRadius: 5, margin: 5, justifyContent: 'center' }
	});
