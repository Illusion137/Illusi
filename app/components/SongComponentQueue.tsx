import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as GLOBALS from '../../globals';
import { darkThemeDefault } from '../../Preferences';
import { Artwork, QueueTrack, Track } from '../../types';

function SongComponentQueue(props: {
	track_data: QueueTrack
}) {
	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);

	return (
		<View style={{backgroundColor: colors.track}}  >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.track_data.artwork as any} style={styles.image}></Image>
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.track_data.video_creator}</Text>
				</View>
            </View>
			<View style={styles.line}/>
		</View>
	);
}

const themeStyles = (colors: typeof darkThemeDefault.colors) => StyleSheet.create({
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

export default SongComponentQueue;