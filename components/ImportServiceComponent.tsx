import { View, Text, TouchableHighlight, StyleSheet, Alert } from "react-native";
import { MusicServiceType } from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import usePTheme from '@hooks/usePTheme';
import IImage from './IImage';
import { Illusive } from '@illusive/illusive';
import { router } from "expo-router";

export default function ImportServiceComponent(props: {
    service_name: MusicServiceType,
}) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

    const service = Illusive.music_service.get(props.service_name)!;
    const artwork = service.app_icon;
    const disabled = !(service.has_credentials() 
        || service.cookie_jar_callback === undefined 
        || Illusive.free_music_services.includes(props.service_name));
    
    function navigate_or_alert(){
        // TODO {title: `Import ${props.service_name} Playlist`}
        // TODO more usefull messages
        if(!disabled){
            router.dismiss();
            router.push({pathname: "/(tabs)/playlists/import/[service_name]", params: {service_name: props.service_name}});
        }
        else {
            Alert.alert("Authorization Error", "You are missing the required authorization to use this feature\n Or this feature is still under development");
        }
    }

    return (
        <>        
            <TouchableHighlight style={{opacity: !disabled ? 1 : 0.5}} activeOpacity={0.6} underlayColor={colors.text} onPress={navigate_or_alert}>
                <View style={styles.import_from}>
                    <IImage style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={artwork}/>
                    <Text style={styles.import_from_text}>Import Playlist From {props.service_name}</Text>
                </View>
            </TouchableHighlight>
            <View style={styles.line}/>
        </>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	import_from:{
		height: 45,
		width: '100%',
		backgroundColor: colors.track,
		flexDirection: 'row',
		alignItems: 'center',
	},
	import_from_text:{
		color: colors.text,
		fontSize: 16
	},
    line:{
		width: '100%',
		height: 0.8,
		backgroundColor: colors.line,
		marginHorizontal: 10,
	}
});