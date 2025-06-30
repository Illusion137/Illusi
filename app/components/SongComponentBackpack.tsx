import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { Track } from '../../lib-origin/Illusive/src/types';
import { artist_string, duration_to_string } from '../../lib-origin/Illusive/src/illusive_utilts';
import * as SQLBackpack from '../../lib-origin/Illusive/src/illusi/src/sql/sql_backpack';

function SongComponentBackpack(props: {
	track_data: Track,
}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	const [disabled, set_disabled] = useState(false)

	return (
		<View style={{backgroundColor: colors.track}}  >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.track_data.playback!.artwork as any} style={styles.image}></Image>
					{props.track_data.duration !== undefined && <View style={{position: 'absolute', left: duration_to_string(props.track_data.duration).left, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{duration_to_string(props.track_data.duration).duration}</Text>
					</View>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{artist_string(props.track_data)}</Text>
				</View>
				{ !(disabled) && <TouchableOpacity style={{alignSelf:'center', left: 20, padding: 10}} onPress={async () => {
					set_disabled(true);
                    await SQLBackpack.toss_from_backpack(props.track_data)
				}}>
					<Ionicons name='swap-horizontal' size={24} color={colors.primary}/>
				</TouchableOpacity>}
            </View>
			<View style={styles.line}/>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
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
		color: colors.title,
		fontSize:15,
	},
	artist:{
		color: colors.subtext,
		fontSize:14
	},
	line:{
		height: 1,
		backgroundColor: colors.line,
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