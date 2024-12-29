import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

export default function TrackPlaceholderComponent() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	return (
		<View style={{backgroundColor: colors.track}} >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<View style={styles.image}></View>
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
		borderRadius: 5,
        backgroundColor: colors.shelf
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
	icon0:{
		marginRight: 5
	},
    icon1:{
		marginRight: 3
	},
	elseIcon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	}
});