import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, Image, StyleSheet, ImageSourcePropType, Alert } from "react-native";
import { MusicServiceType } from '../../types';

function ImportServiceComponent(props: {
    navigation: NavigationProp<any, any>,
    service_name: MusicServiceType,
    img_props: ImageSourcePropType,
    disabled?: boolean
}) {

	const { colors } = useTheme();
	const styles = themeStyles(colors);
    
    function navigateOrAlert(){
        if(!props.disabled)
            props.navigation.navigate('SelectImportServicePlaylist' , {title: `Import ${props.service_name} Playlist`});
        else Alert.alert("Authorization Error", "You are missing the required authorization to use this feature\n Or this feature is still under development");
    }

    return (
        <>        
            <TouchableHighlight style={{opacity: !props.disabled ? 1 : 0.5}} activeOpacity={0.6} underlayColor="#FFFFFF" onPress={navigateOrAlert}>
                <View style={styles.importfrom}>
                    <Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={props.img_props}/>
                    <Text style={styles.importfromtext}>Import Playlist From {props.service_name}</Text>
                </View>
            </TouchableHighlight>
            <View style={styles.line}/>
        </>
    )
}

const themeStyles = (colors) => StyleSheet.create({
	importfrom:{
		height: 45,
		width: '100%',
		backgroundColor: 'black',
		flexDirection: 'row',
		alignItems: 'center',
	},
	importfromtext:{
		color: '#FFFFFF',
		fontSize: 16
	},
    line:{
		width: '100%',
		height: 0.8,
		backgroundColor: '#202020',
		marginHorizontal: 10,
	}
});

export default ImportServiceComponent;