import React from 'react';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { artist_string, duration_to_string } from '@illusive/illusive_utilts';
import { Prefs } from '@illusive/prefs';
import { Track } from '@illusive/types';
import { Constants } from '@illusive/constants';
import { is_empty } from '@common/utils/util';
import usePTheme from '@hooks/usePTheme';
import { GLOBALS } from '@illusive/globals';
import { reinterpret_cast } from '../lib-origin/common/cast';
import IImage from './IImage';

export default function TrackComponentBase(props: {
		track_data: Track;
        is_downloading?: boolean;
        style?: StyleProp<ViewStyle>;
        active_opacity?: number;
        disabled?: boolean;
        on_press: (() => any)|undefined;
        on_long_press: () => any;
        children?: React.ReactNode;
	}) {

	const tint = GLOBALS.global_var.tint_table.get(props.track_data.uid);

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	return (
		<TouchableOpacity
            activeOpacity={props.active_opacity}
			disabled={props.disabled}
			onLongPress={props.on_long_press} delayLongPress={Constants.long_press_delay}
			style={{...reinterpret_cast<{}>(props.style), backgroundColor: colors.track}} 
			onPress={props.on_press}>
			<View style={styles.track_box}>
				<View style={styles.centered}>
					<IImage source={props.track_data.playback?.artwork} style={styles.image} tint={is_empty(tint) ? undefined : {color: tint!, opacity: Constants.tint_opacity}}/>
					{is_empty(tint) ? null : <View style={{...styles.image, opacity: 0.15, position: 'absolute', backgroundColor: tint}}/>}
					{!isNaN(props.track_data.duration) && !is_empty(props.track_data.duration) ? 
						<View style={{position: 'absolute', right: duration_to_string(props.track_data.duration).length * -1.5, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
							<Text style={{color:'white', fontSize:10}}>{duration_to_string(props.track_data.duration)}</Text>
						</View> : null
					}
				</View>
                {/* TODO investigate this style params */}
				<View style={{ top: 5, left: 20 }}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{artist_string(props.track_data)}</Text>
                    <View style={{flexDirection: 'row'}}>
    					<Text style={styles.album} numberOfLines={1} >{props.track_data.album?.name ?? ""}</Text>
                        {((props.track_data.explicit ?? "NONE") === "EXPLICIT") ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {((props.track_data.explicit ?? "NONE") === "CLEAN") ? <MaterialIcons name="clean-hands" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {(props.track_data?.meta?.unavailable ?? false) ? <MaterialCommunityIcons name="file-hidden" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.thumbnail_uri)  ? <Ionicons name="image" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.lyrics_uri)     ? <MaterialIcons name="closed-caption" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.media_uri)      ? <Ionicons name="save-sharp" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {(props.is_downloading)                     ? <MaterialIcons name="downloading" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.youtube_id)     ? <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.imported_id)    ? <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.soundcloud_id)  ? <MaterialCommunityIcons name="soundcloud" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.spotify_id)     ? <MaterialCommunityIcons name="spotify" size={15} color={colors.secondary} style={styles.icon_thick}/> : null}
                        {!is_empty(props.track_data.applemusic_id)  ? <MaterialCommunityIcons name="apple" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.amazonmusic_id) ? <Ionicons name="logo-amazon" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.meta?.begdur) || !is_empty(props.track_data.meta?.enddur) ? <Ionicons name="cut" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
					</View>
				</View>
                ...props.children
			</View>
			<View style={styles.line}/>
		</TouchableOpacity>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	track_box:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
    image:{
		left: 10,
		height: 48,
		width: 52,
		borderRadius: 2,
        resizeMode: "cover",
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
    album:{
		color: colors.deeptext,
		fontSize: 12,
        top: 1,
        marginRight: 4
	},
	line:{
		height: 1,
		backgroundColor: colors.line,
		width: '90%',
		left: 85
	},
	icon_thin:{
		marginRight: 5
	},
    icon_thick:{
		marginRight: 3
	},
	else_icon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	},
    centered:{
        justifyContent: "center"
    }
});