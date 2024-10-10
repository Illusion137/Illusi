import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import * as SQLActions from '../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { Artwork, Track } from '../../lib-origin/Illusive/src/types';
import { generateNewUID } from '../../lib-origin/origin/src/utils/util';

function SongComponentBackpack(props: {
	track_data: Track,
	old_uid: string
}) {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
	const [disabled, setDisabled] = useState(false)

	function durationToString(): {left: number, duration: string}{
		let left: number = 50;
		let duration: string = "";
		if(props.track_data.duration/3600 >= 1){
			let hours = Math.floor(props.track_data.duration / 3600);
			let minutes = Math.floor(props.track_data.duration % 3600 / 60);
			let seconds = Math.floor(props.track_data.duration % 3600 % 60);
			
			duration = String(hours) + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 8 ? 19 : 15;
		}else if(props.track_data.duration / 60 >= 1){
			let minutes = Math.floor(props.track_data.duration / 60);
			let seconds = Math.floor(props.track_data.duration % 60);
			duration = String(minutes) + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 5 ? 8 : 0
		}else{
			duration = String(props.track_data.duration).padStart(2,'0')
			left += 8
		}
		return {'left': left, 'duration': duration};
	}

	return (
		<View style={{backgroundColor: colors.track}}  >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.track_data.playback!.artwork as any} style={styles.image}></Image>
					{props.track_data.duration !== undefined && <View style={{position: 'absolute', left: durationToString().left, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{durationToString().duration}</Text>
					</View>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.track_data.artists.join(", ")}</Text>
				</View>
				{ !(disabled) && <TouchableOpacity style={{alignSelf:'center', left: 20, padding: 10}} onPress={async () => {
					setDisabled(true);
					// await SQLActions.swapFromBackpack(props.old_uid, {
					// 	'uid': generateNewUID(props.track_data.title),
					// 	'title': props.track_data.title,
					// 	'artists': props.track_data.artists,
					// 	'video_id': props.track_data.youtube_id,
					// 	'duration': props.track_data.duration,
					// 	'youtube': true,
					// 	'saved': true
					// });
                    // TODO: FIX THIS
				}}>
					<Ionicons name='swap-horizontal-outline' size={24} color={colors.primary}/>
				</TouchableOpacity>}
            </View>
			<View style={styles.line}/>
		</View>
	);
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	songbox:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
	image:{
		left: 10,
		height: '80%',
		width: 65,
		borderRadius: 5
	},
	text:{
		width: '65%',
		top: 5,
		left: 20
	},
	title:{
		color: '#D0D0D0',
		fontSize:15,
	},
	artist:{
		color: '#808080',
		fontSize:14
	},
	line:{
		height: 1,
		backgroundColor: '#202020',
		width: '90%',
		left: 85
	},
	icon:{
		marginRight: 5
	},
	elseIcon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	}
});

export default SongComponentBackpack;