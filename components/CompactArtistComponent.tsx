import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { CompactArtist } from '@illusive/types';
import type { Prefs } from '@illusive/prefs';
import { is_empty } from '@common/utils/util';
import { MaterialIcons } from '@expo/vector-icons';
import usePTheme from '@hooks/usePTheme';
import IImage from './IImage';
import { remove_topic } from '@common/utils/clean_util';
import { SharedRouter } from '@utils/shared_routes';
import { ContextMenuView } from '@components/ContextMenu';
import { ContextResolver } from '@utils/context_resolver';
import { ArtistContextMenu } from '@utils/context_menu';
import useMenuConfig from '@hooks/useMenuConfig';
import { reinterpret_cast } from '@common/cast';
import { catch_log } from '@common/utils/error_util';
import { Constants } from '@illusive/constants';

export default function CompactArtistComponent(props: { artist_data: CompactArtist; base_background?: boolean }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const [menu_config, refresh_menu_config] = useMenuConfig(() => ArtistContextMenu.artist_component_context_menu(props.artist_data));

	async function navigate() {
		if (is_empty(props.artist_data.name.uri)) return;
		SharedRouter.goto_shared_artist(props.artist_data.name.uri ?? '');
	}

	const artwork
		= typeof props.artist_data.profile_artwork_url !== 'string'
			? props.artist_data.profile_artwork_url
			: !props.artist_data.profile_artwork_url?.includes('http')
					? props.artist_data.profile_artwork_url.replace('//', 'https://')
					: props.artist_data.profile_artwork_url;

	return (
		<ContextMenuView
			isContextMenuEnabled={!is_empty(props.artist_data.name.uri)}
			menuConfig={menu_config}
			onMenuWillShow={refresh_menu_config}
			onPressMenuItem={({ nativeEvent }) => {
				ContextResolver.resolve_artist_context(props.artist_data, reinterpret_cast<ContextResolver.ArtistContextKeys>(nativeEvent.actionKey)).catch(catch_log);
			}}
		>
			<TouchableOpacity style={[styles.button, { backgroundColor: props.base_background ? colors.background : colors.track }]} onPress={navigate} onLongPress={() => {}} delayLongPress={Constants.long_press_delay}>
				<>
					<View style={{ width: 8 }} />
					<IImage source={artwork} style={styles.image} />
					<View style={{ flexDirection: 'column', left: 20 }}>
						<View style={{ flexDirection: 'row' }}>
							<Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{remove_topic(props.artist_data.name?.name)}</Text>
							{props.artist_data.is_official_artist_channel ? <MaterialIcons name="verified" size={18} style={{ left: '6%' }} color={colors.primary} /> : null}
						</View>
						<Text style={{ color: colors.subtext, fontSize: 15, right: 1, paddingTop: 2 }}>Artist</Text>
					</View>
				</>
			</TouchableOpacity>
			<View style={{ width: '100%', height: 1, marginLeft: 90, backgroundColor: '#303030' }} />
		</ContextMenuView>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		button: { width: '100%', height: 60, alignItems: 'center', backgroundColor: colors.track, flexDirection: 'row' },
		notfound: { width: 70, height: 70, borderRadius: 5, left: 15 },
		image: { left: 5, height: 52, width: 52, borderRadius: 50, borderWidth: 1, borderColor: colors.line }
	});
