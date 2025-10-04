import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompactPlaylist } from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import { empty_join_dot, is_empty } from '@common/utils/util';
import { MaterialIcons } from '@expo/vector-icons';
import { best_thumbnail } from '@illusive/illusive_utilts';
import { Navigator } from '@illusive/illusi/src/types';
import usePTheme from '@hooks/usePTheme';
import IImage from './IImage';
import { remove_topic } from '@common/utils/clean_util';

export default function CompactPlaylistComponent(props: {
	playlist_data: CompactPlaylist
}) {
    const thumbnail_uri = props.playlist_data.artwork_thumbnails !== undefined ? best_thumbnail(props.playlist_data.artwork_thumbnails!)?.url : props.playlist_data.artwork_url!;
	const navigation: Navigator = useNavigation();

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

    async function navigate(){
        if(is_empty(props.playlist_data.title.uri)) return;
        navigation.push("Playlist", {"uri": props.playlist_data.title.uri, compact_playlist: props.playlist_data});
    }

	return(
        <>
			<TouchableOpacity style={styles.button} onPress={navigate}>
                <>
					<View style={{width: 15}}/>
                    <IImage source={thumbnail_uri} style={styles.image}/>
					<View style={{flexDirection: 'column', left: 20}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.playlist_data.title.name}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
                            {((props.playlist_data.explicit ?? "NONE") === "EXPLICIT") ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
							<Text style={{color: '#AAAAAA'}}>{empty_join_dot([props.playlist_data.artist.map(artist => remove_topic(artist.name)).join(", "), new Date(props.playlist_data?.date!).getFullYear()])}</Text>
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
    icon_thin:{
		marginRight: 5
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