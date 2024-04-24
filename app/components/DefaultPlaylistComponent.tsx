import { NavigationProp, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, Image, StyleSheet, ImageSourcePropType, Alert } from "react-native";
import { Track } from '../../types';
import FourTrackArtwork from './FourTrackArtwork';
import { darkThemeDefault } from '../../Preferences';

export default function DefaultPlaylistComponent(props: {
    navigation: NavigationProp<any, any>,
    four_track: Track[]
    title: string,
}) {

	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
    
    async function navigate(){
        props.navigation.navigate('Playlist', {'title': props.title});
    }

    return (
        <TouchableHighlight style={styles.defaultPlaylistButton} onPress={navigate}>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
                <Text style={styles.defaultPlaylistText}>{props.title}</Text>
                <FourTrackArtwork four_track={props.four_track} size={55} dim={true}/>
            </View>
        </TouchableHighlight>
    )
}

const themeStyles = (colors: typeof darkThemeDefault.colors) => StyleSheet.create({
	defaultPlaylistText:{
		color:'#FFFFFF', 
		fontSize: 18, 
		fontWeight: 'bold', 
		textAlign:'center',
		position: 'absolute',
		zIndex: 1
	},
	defaultPlaylistButton:{
		backgroundColor: '#121212', 
		height: 110, 
		width: 110,
		borderRadius: 5,
		margin: 5,
		justifyContent: 'center'
	},
	notfound:{
		width:110,
		height:110,
		borderRadius: 5,
	},
});