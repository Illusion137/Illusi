import { NavigationProp, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, StyleSheet, Dimensions } from "react-native";
import { Track } from '../../lib-origin/Illusive/src/types';

import FourTrackArtwork from './FourTrackArtwork';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

const { width } = Dimensions.get("screen");
const item_size = width * .3;
export default function DefaultPlaylistComponent(props: {
    navigation: NavigationProp<any, any>,
    four_track: Track[]
    title: string,
    force_order?: boolean,
}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    async function navigate(){
        props.navigation.navigate('Playlist', {'default_playlist_title': props.title, 'force_order': props.force_order});
    }

    return (
        <TouchableHighlight style={styles.default_playlist_button} onPress={navigate}>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
                <Text style={styles.default_playlist_text}>{props.title}</Text>
                <FourTrackArtwork four_track={props.four_track} size={item_size/2} dim={true}/>
            </View>
        </TouchableHighlight>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	default_playlist_text:{
		color: colors.text, 
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