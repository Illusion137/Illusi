import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as GLOBALS from '../../globals';
import * as Prefs from '../../Preferences';
import * as SQLActions from '../../SQLActions';
import { GenerateNewUID } from '../Illusive/IllusiveSearch';

function SongComponentBackpack(props) {	
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [disabled, setDisabled] = useState(false)

	function durationToString(){
		let duration = props.video_duration;
		let subLength = 50;
		let stringDuration = '';
		if(duration/3600 >= 1){
			let hours = Math.floor(duration / 3600);
			let minutes = Math.floor(duration % 3600 / 60);
			let seconds = Math.floor(duration % 3600 % 60);
			
			stringDuration = String(hours) + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0')
			subLength -= stringDuration.length == 8 ? 19 : 15;
		}else if(duration/60 >= 1){
			let minutes = Math.floor(duration / 60);
			let seconds = Math.floor(duration % 60);
			stringDuration = String(minutes) + ':' + String(seconds).padStart(2,'0')
			subLength -= stringDuration.length == 5 ? 8 : 0
		}else{
			stringDuration = String(duration).padStart(2,'0')
			subLength += 8
		}
		return [subLength, stringDuration]
	}

	return (
		<View style={{backgroundColor: colors.track}}  >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.artwork} style={styles.image}></Image>
					{props.video_duration !== undefined && <View style={{position: 'absolute', left: durationToString()[0], bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{durationToString()[1]}</Text>
					</View>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
				</View>
				{ !(disabled || props.disabled) && <TouchableOpacity style={{alignSelf:'center', left: 20, padding: 10}} onPress={async () => {
					setDisabled(true)
					await SQLActions.swapFromBackpack(props.oldUID, new SQLActions.Track({
						'uid': GenerateNewUID(props.video_name),
						'video_name': props.video_name,
						'video_creator': props.video_creator,
						'video_id': props.video_id,
						'video_duration': props.video_duration,
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

const themeStyles = (colors) => StyleSheet.create({
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