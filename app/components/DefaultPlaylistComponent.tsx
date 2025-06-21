import { NavigationProp, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, StyleSheet, Dimensions } from "react-native";
import { Track } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { sprinkle_into_queue } from '../../lib-origin/Illusive/src/illusi/src/play';
import { useState } from 'react';
import FourTrackArtwork from './FourTrackArtwork';
import * as SQLPlaylists from "../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists";
import * as GLOBALS from "../../lib-origin/Illusive/src/illusi/src/globals";
import * as Haptics from "expo-haptics";
import { ContextMenuView } from 'react-native-ios-context-menu';

const { width } = Dimensions.get("screen");
const item_size = width * .29;
export default function DefaultPlaylistComponent(props: {
    navigation: NavigationProp<any, any>,
    four_track: Track[]
    title: string,
    force_order?: boolean,
}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
	const [is_playing_music, set_is_playing_music] = useState(GLOBALS.global_var.is_playing);

    async function navigate(){
        props.navigation.navigate('Playlist', {'default_playlist_title': props.title, 'force_order': props.force_order});
    }

    return (
		<ContextMenuView
			menuConfig={{
				menuTitle: `Illusi Playlist - ${props.title}`,
				menuItems: [
					{
						actionKey: "playlist-sprinkle-in-queue",
						actionTitle: "Sprinke in Queue",
						menuAttributes: is_playing_music ? undefined : ["disabled"],
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
								systemName: 'square.3.layers.3d.middle.filled',
							},
						},
					},
				],
			}}
			onMenuWillShow={() => {
				set_is_playing_music(GLOBALS.global_var.is_playing);
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			}}
			onPressMenuItem={async({nativeEvent}) => {
				switch(nativeEvent.actionKey){
					case "playlist-sprinkle-in-queue": sprinkle_into_queue(await SQLPlaylists.playlist_tracks(props.title));  break;
					default: break;
				}
			}}
		>
			<TouchableHighlight style={styles.default_playlist_button} onPress={navigate}>
				<View style={{justifyContent: 'center', alignItems: 'center'}}>
					<Text style={styles.default_playlist_text}>{props.title}</Text>
					<FourTrackArtwork four_track={props.four_track} size={item_size/2} dim={true}/>
				</View>
			</TouchableHighlight>
		</ContextMenuView>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	default_playlist_text:{
		color: "white", 
		fontSize: 18, 
		fontWeight: 'bold', 
		textAlign:'center',
		position: 'absolute',
		zIndex: 1
	},
	default_playlist_button:{
		backgroundColor: colors.card, 
		height: item_size, 
		width: item_size,
		borderRadius: 5,
		margin: 5,
		justifyContent: 'center'
	},
});