import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as GLOBALS from '../../globals';
import * as Prefs from '../../Preferences';
import * as SQLActions from '../../SQLActions';
import { GenerateNewUID } from '../Illusive/IllusiveSearch';
import { Artwork, Track } from '../../types';

function SongComponentBackpack(props: {
	track_data: Track,
	old_uid: string
}) {
	const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);
	const [disabled, setDisabled] = useState(false)

	function durationToString(): {left: number, duration: string}{
		let left: number = 50;
		let duration: string = "";
		if(props.track_data.video_duration/3600 >= 1){
			let hours = Math.floor(props.track_data.video_duration / 3600);
			let minutes = Math.floor(props.track_data.video_duration % 3600 / 60);
			let seconds = Math.floor(props.track_data.video_duration % 3600 % 60);
			
			duration = String(hours) + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 8 ? 19 : 15;
		}else if(props.track_data.video_duration / 60 >= 1){
			let minutes = Math.floor(props.track_data.video_duration / 60);
			let seconds = Math.floor(props.track_data.video_duration % 60);
			duration = String(minutes) + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 5 ? 8 : 0
		}else{
			duration = String(props.track_data.video_duration).padStart(2,'0')
			left += 8
		}
		return {'left': left, 'duration': duration};
	}

	return (
		<View style={{backgroundColor: colors.track}}  >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.track_data.artwork as any} style={styles.image}></Image>
					{props.track_data.video_duration !== undefined && <View style={{position: 'absolute', left: durationToString().left, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{durationToString().duration}</Text>
					</View>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.track_data.video_creator}</Text>
				</View>
				{ !(disabled || props.track_data.disabled) && <TouchableOpacity style={{alignSelf:'center', left: 20, padding: 10}} onPress={async () => {
					setDisabled(true);
					await SQLActions.swapFromBackpack(props.old_uid, new Track({
						'uid': GenerateNewUID(props.track_data.video_name),
						'video_name': props.track_data.video_name,
						'video_creator': props.track_data.video_creator,
						'video_id': props.track_data.video_id,
						'video_duration': props.track_data.video_duration,
						'youtube': true,
						'saved': true
					}));
				}}>
					<Ionicons name='swap-horizontal-outline' size={24} color={colors.primary}/>
				</TouchableOpacity>}
            </View>
			<View style={styles.line}/>
		</View>
	);
}

const themeStyles = (colors: typeof Prefs.darkThemeDefault.colors) => StyleSheet.create({
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