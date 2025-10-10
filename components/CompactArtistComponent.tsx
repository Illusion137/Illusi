import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CompactArtist } from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import { is_empty } from '@common/utils/util';
import { MaterialIcons } from '@expo/vector-icons';
import usePTheme from '@hooks/usePTheme';
import IImage from './IImage';
import { remove_topic } from '@common/utils/clean_util';
import { SharedRouter } from '@utils/shared_routes';


export default function CompactArtistComponent(props: {
	artist_data: CompactArtist
}) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	async function navigate(){
		if(is_empty(props.artist_data.name.uri)) return;
		SharedRouter.goto_shared_artist( props.artist_data.name.uri ?? "" );
	}
	return(
        <>
			<TouchableOpacity style={styles.button} onPress={navigate}>
                <>
					<View style={{width: 15}}/>
					<IImage source={!props.artist_data.profile_artwork_url?.includes("http") ? props.artist_data.profile_artwork_url!.replace('//', 'https://') : props.artist_data.profile_artwork_url} style={styles.image}/>
					<View style={{flexDirection: 'column', left: 20}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{remove_topic(props.artist_data.name?.name)}</Text>
					</View>
					{props.artist_data.is_official_artist_channel ? 
						<MaterialIcons name='verified' size={18} style={{left: "6%"}} color={colors.primary}/>
					: null}
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
		borderRadius: 50
	},
});