import React, { useEffect, useState } from 'react';
import * as SQLTracks from '../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import FourTrackArtwork from './FourTrackArtwork';
import { CompactPlaylistData, Playlist, SerializedCompactPlaylistData } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { MaterialIcons } from '@expo/vector-icons';

export default function CompactWriterPlaylistComponent(props: {
	playlist_data: CompactPlaylistData;
    write_playlist_uuid: string;
}) {
	const navigation: NavigationProp<any, any> & {push: (route: string, params: any) => void} = useNavigation();

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    async function navigate(){
        const tracks = await props.playlist_data.track_callback();
		const serialized_data: SerializedCompactPlaylistData = {
            title: props.playlist_data.title,
            tracks: props.playlist_data.check_existing_tracks ? 
				tracks.filter(async (track) => await SQLTracks.track_exists(track) ) : tracks,
            type: props.playlist_data.type
        };
        navigation.push("Playlist", {
            write_playlist_uuid: props.write_playlist_uuid,
            serialized_playlist_data: serialized_data,
        });           
    }

	const [visual_data, set_visual_data] = useState<Playlist['visual_data']>();

	useEffect(() => {
		(async() => {
			if(props.playlist_data.four_track){
				const resolved_tracks = await Promise.resolve(props.playlist_data.four_track);
				set_visual_data({four_track: resolved_tracks?.slice(0,4) ?? [], track_count: Math.max(resolved_tracks?.length ?? 0, props.playlist_data.track_count)});
			}
		})()
	}, [props.playlist_data]);

	return(
        <>
			<TouchableOpacity style={styles.button} onPress={navigate}>
                <>
					<View style={{width: 15}}/>
                    <FourTrackArtwork thumbnail_uri={props.playlist_data.thumbnail_uri} four_track={visual_data?.four_track ?? []} size={26}/>
					<View style={{flexDirection: 'column', left: 20}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.playlist_data.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							{(props.playlist_data.pinned ?? false) ? (<MaterialIcons name="push-pin" size={20} color={colors.primary}/> ) : null}
							<Text style={{color: '#AAAAAA'}}>{visual_data?.track_count ?? 0} Tracks</Text>
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