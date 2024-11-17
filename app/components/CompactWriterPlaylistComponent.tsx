import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import FourTrackArtwork from './FourTrackArtwork';
import { CompactPlaylistData, SerializedCompactPlaylistData } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

export default function CompactWriterPlaylistComponent(props: {
	playlist_data: CompactPlaylistData
    write_playlist_uuid: string
}) {
	const navigation: NavigationProp<any, any> & {push: (route: string, params: any) => void} = useNavigation();

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    async function navigate(){
        const serialized_data: SerializedCompactPlaylistData = {
            title: props.playlist_data.title,
            tracks: await props.playlist_data.track_callback(),
            type: props.playlist_data.type
        };
        navigation.push("Playlist", {
            write_playlist_uuid: props.write_playlist_uuid,
            serialized_playlist_data: serialized_data,
        });           
    }

	return(
        <>
			<TouchableOpacity style={styles.button} onPress={navigate}>
                <>
					<View style={{width: 15}}/>
                    <FourTrackArtwork four_track={props.playlist_data.four_track} size={26}/>
					<View style={{flexDirection: 'column', left: 20}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.playlist_data.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							<Text style={{color: '#AAAAAA'}}>{props.playlist_data.track_count} Tracks</Text>
						</View>
					</View>
                </>
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
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
		borderRadius: 5
	},
});