import { NavigationProp, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, Image, StyleSheet, ImageSourcePropType, Alert } from "react-native";
import { MusicServiceType } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

function ImportServiceComponent(props: {
    navigation: NavigationProp<any, any>,
    service_name: MusicServiceType,
    img_props: ImageSourcePropType,
    disabled?: boolean
}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    function navigate_or_alert(){
        if(!props.disabled)
            props.navigation.navigate('SelectImportMusicServicePlaylist' , {title: `Import ${props.service_name} Playlist`});
        else Alert.alert("Authorization Error", "You are missing the required authorization to use this feature\n Or this feature is still under development");
    }

    return (
        <>        
            <TouchableHighlight style={{opacity: !props.disabled ? 1 : 0.5}} activeOpacity={0.6} underlayColor={colors.text} onPress={navigate_or_alert}>
                <View style={styles.import_from}>
                    <Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={props.img_props}/>
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

export default ImportServiceComponent;