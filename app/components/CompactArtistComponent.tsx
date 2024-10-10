import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { CompactArtist } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';


export default function CompactArtistComponent(props: {
	artist_data: CompactArtist
    on_press?: () => void|Promise<void>
}) {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
	return(
        <>
			<TouchableOpacity style={styles.button} onPress={props.on_press}>
                <>
					<View style={{width: 15}}/>
					<Image source={{"uri":  !props.artist_data.profile_thumbnail_uri!.includes("http") ? props.artist_data.profile_thumbnail_uri!.replace('//', 'https://') : props.artist_data.profile_thumbnail_uri, "cache": "force-cache"}} style={styles.image}/>
					<View style={{flexDirection: 'column', left: 20}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.artist_data.name?.name}</Text>
					</View>
                </>
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	button:{
		width: '100%',
		height: 60, 
		alignItems: 'center',
        backgroundColor: colors.track,
        flexDirection: 'row'
	},
    notfound:{
		width:70,
		height:70,
		borderRadius: 5,
        left: 15
	},
    image:{
		left: 5,
		height: 52,
		width: 52,
		borderRadius: 50
	},
});