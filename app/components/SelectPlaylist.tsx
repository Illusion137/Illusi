import React, { useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';import FourTrackArtwork from './FourTrackArtwork';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { Playlist } from '../../lib-origin/Illusive/src/types';

function SelectPlaylist(props: {playlist: Playlist}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const [selected, set_selected] = useState(GLOBALS.global_var.selected_playlists_uuids.has(props.playlist.uuid));

	return(
        <>
            <TouchableOpacity style={styles.button} onPress={() => {let _selected = !selected; set_selected(_selected); 
                if(_selected){
                    GLOBALS.global_var.selected_playlists_uuids.add(props.playlist.uuid)
                }else{
                    GLOBALS.global_var.selected_playlists_uuids.delete(props.playlist.uuid)
                }
                }}>
                <>
                    <FourTrackArtwork four_track={props?.playlist?.visual_data?.four_track ?? []} size={35} />
                        <View style={{flexDirection: 'column', left: 25}}>
                            <Text style={{color: '#FFFFFF', fontSize:15}}>{props.playlist.title}</Text>
                            <View style={{flexDirection: 'row', top: 5}}>
                                {props.playlist.pinned ? <MaterialIcons name="push-pin" size={22} color={colors.primary}/> : null}
                                <Text style={{color: '#AAAAAA'}}>{props?.playlist?.visual_data?.track_count ?? 0} Tracks</Text>
                            </View>
                        </View>
                        <View style={{flex:1, justifyContent: 'flex-end', alignItems: 'center'}}>
                            <Ionicons name={'checkmark'} size={22} color={selected ? colors.green : "#808080"} style={{ left: 80}}/>
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
		height: 80, 
		alignItems: 'flex-start',
        backgroundColor: colors.track,
        flexDirection: 'row'
	},
    notfound:{
		width:70,
		height:70,
		borderRadius: 5,
        left: 15
	}
});
export default SelectPlaylist;