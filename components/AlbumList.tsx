import { Text, View } from 'react-native';
import type { CompactPlaylist, Continuation } from '@illusive/types';
import type { Track } from '@illusive/types';
import type { SecondLineType } from './Album';
import Album from './Album';
import { IoniconsTouchableOpacity } from './TouchableIconOpacity';
import { useEffect, useState, useMemo } from 'react';
import usePTheme from '@hooks/usePTheme';
import useDimensions from '@hooks/useDimensions';
import { FlashList } from '@shopify/flash-list';
import { SharedRouter } from '@utils/shared_routes';

export default function AlbumList(props: {
	title: string;
	else_type: 'ALBUM' | 'SINGLE' | 'EP';
	albums: CompactPlaylist[];
	continuation?: Continuation<CompactPlaylist>;
	second_line_type?: SecondLineType;
}) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const album_list_height = useMemo(() => width * 0.4 + 50, [width]);

	const other_tracks = props.albums.filter(album => album.song_track).map(album => album.song_track) as Track[];
	const render_album = (item: { item: CompactPlaylist }) => (<Album album_data={item.item} second_line_type={props.second_line_type} other_tracks={other_tracks} />);

	const [albums, set_albums] = useState<CompactPlaylist[]>(props.albums);

	useEffect(() => {
		set_albums(props.albums);
	}, [props.albums]);

	function full_screen() {
		SharedRouter.goto_shared_album_grid(props.title, props.albums, props.continuation);
	}

	return (
		<View style={{ paddingVertical: 10 }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
				<Text style={{ color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15 }}>{props.title}</Text>
				<IoniconsTouchableOpacity icon_name="chevron-forward" icon_color={colors.text} on_press={full_screen} icon_size={20} icon_style={{ right: 20 }} hitslop={12} />
			</View>
			<View style={{ paddingHorizontal: 10, height: album_list_height, justifyContent: 'center' }}>
				<FlashList data={albums.map(item => ({ ...item, album_type: item.album_type ?? props.else_type }))} renderItem={render_album} horizontal={true} />
			</View>
		</View>
	);
}
