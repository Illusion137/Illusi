import React, { createRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import type { Prefs } from '@illusive/prefs';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder'
import { LinearGradient } from 'expo-linear-gradient';
import usePTheme from '@hooks/usePTheme';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
export default function TrackPlaceholderComponent() {
	const thumbnail_ref = createRef<any>();
	const title_ref = createRef<any>();
	const artist_ref = createRef<any>();
	const album_ref = createRef<any>();

	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const shimmer_colors = ['#ebebeb', '#969696', '#ebebeb'];

	useEffect(() => {
		const animation = Animated.parallel(
			[
				thumbnail_ref.current.getAnimated(),
					title_ref.current.getAnimated(),
					artist_ref.current.getAnimated(),
					album_ref.current.getAnimated()
			]
		);
		Animated.loop(animation).start();
	}, []);

	return ( 
		<View style={{backgroundColor: colors.track}} >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<ShimmerPlaceholder
						style={styles.image}
						ref={thumbnail_ref}
						shimmerColors={shimmer_colors}
					/>
				</View>
				<View style={{ width: '60%', top: 5, left: 20 }}>
					<ShimmerPlaceholder style={styles.title} ref={title_ref} shimmerColors={shimmer_colors}/>
					<ShimmerPlaceholder style={styles.artist} ref={artist_ref} shimmerColors={shimmer_colors}/>
                    <View style={{flexDirection: 'row'}}>
    					<ShimmerPlaceholder style={styles.album} ref={album_ref} shimmerColors={shimmer_colors}/>
					</View>
				</View>
			</View>
			<View style={styles.line}/>
		</View>
	);
}

const theme_styles = (_: Prefs.Theme['colors']) => StyleSheet.create({
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
		opacity: 0.8
	},
	text:{
		width: '65%',
		top: 5,
		left: 20
	},
	title:{
		top: 1,
		width: '76%',
		fontSize:15,
		opacity: 0.8,
		marginBottom: 1
	},
	artist:{
		width: '60%',
		top: 1,
		fontSize:14,
		opacity: 0.8
	},
	album:{
		width: '70%',
		fontSize: 12,
        top: 2,
        marginRight: 4,
		opacity: 0.8
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