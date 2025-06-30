import React, {} from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { QueueTrack, Track } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { artist_string } from '../../lib-origin/Illusive/src/illusive_utilts';

function SongComponentQueue(props: {
	track_data: QueueTrack
}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	return (
        <View style={{backgroundColor: colors.track}}  >
            <View style={styles.songbox}>
                <View style={{justifyContent: 'center'}}>
                    <Image source={props.track_data?.playback?.artwork as any} style={styles.image}></Image>
                </View>
                <View style={styles.text}>
                    <Text style={styles.title} numberOfLines={1} >{props.track_data?.title}</Text>
                    <Text style={styles.artist} numberOfLines={1} >{artist_string(props.track_data as Track)}</Text>
                </View>
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
		color: colors.text,
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

export default SongComponentQueue;