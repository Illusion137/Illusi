import React from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { empty_join_dot } from '../../../lib-origin/origin/src/utils/util';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';

export default function ExtraKeepDeleteScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const thumbnail_uri = 'https://lh3.googleusercontent.com/3YbnDqW0BYPlYMHC9d_4KOpviYqqKslkCi1wr7rJTN0noPl12hBndRasAQ_R5fC2H4hOZXfaCylH4PM1=w544-h544-l90-rj';

	const thumbnail_size = Dimensions.get('screen').width * .9;

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1}}>
			<View style={{height: 50}}/>
			<View>
				<View style={{left: 10, paddingBottom: 15}}>
					<Text style={{color: colors.text, fontSize: 24, fontWeight: '800'}}>Babytron Mark Cuban</Text>
					<Text style={{color: colors.text, fontSize: 18, fontWeight: '200', left: 5}}>{empty_join_dot(["Babytron SB", "Song Wars"])}</Text>
				</View>
			</View>
			<Image source={{uri: thumbnail_uri, cache: 'force-cache'}} style={{width: thumbnail_size, height: thumbnail_size, borderRadius: 10, alignSelf: 'center'}}/>
			<Slider
				thumbTintColor={colors.primary}
				minimumTrackTintColor={colors.primary}
				maximumTrackTintColor='#DADADAA0'
				thumbStyle={{ width: 8, height: 8 }}
				thumbTouchSize={{ width: 40, height: 40 }}
				minimumValue={0}
				/>
			<View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
				<TouchableOpacity onPress={() => {}}>
					<Ionicons name="play-skip-back" size={35} color={colors.primary}/>
					<Text style={{color: colors.primary, position: 'absolute', top: 30, left: 4}}>10s</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => {}}>
					<Ionicons name={"pause-circle-sharp"} size={90} color={colors.primary}/>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => {}}>
					<Ionicons name="play-skip-forward" size={35} color={colors.primary} />
					<Text style={{color: colors.primary, position: 'absolute', top: 30, left: 8}}>10s</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	thick_line_long:{
		width: "90%",
		height: 0.4,
		opacity: 1,
		backgroundColor: colors.text,
	},
	line_long:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
	},
	line_short:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
		marginLeft: 42
	},
    description_text: {
        color: colors.subtext,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 10,
        fontSize: 16
    },
	header_text: {
		paddingTop: 16,
		paddingBottom: 5,
		marginLeft: 10,
		color: colors.text,
		fontSize: 24,
		fontWeight: 'bold',
		backgroundColor: colors.background + 'f0'
	}
});