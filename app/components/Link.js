import React,  { useState } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';


const noneIcon = require('../../assets/dark.png');
const illusiIcon = require('../../assets/icon.png');
const musiIcon = "https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/7d/76/2f/7d762f0e-10ab-1ff2-baf7-84cdaca16219/Icon-1x_U007emarketing-0-6-0-85-220.png/350x350.png?"
const youTubeIcon = "https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/c7/18/fcc718a6-bd55-b1aa-93e4-4073a2ad3b13/logo_youtube_color-1x_U007emarketing-0-6-0-85-220.png/350x350.png?"
const spotifyIcon = "https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?"
const amazonMusicIcon = "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/b8/aa/fcb8aae7-180e-7b29-7c83-255f1c86eba8/AppIcon-1x_U007emarketing-0-10-0-85-220.png/350x350.png?"
const icons = new Map([
    ["None", noneIcon],
    ["Illusi", illusiIcon],
    ["Musi", musiIcon],
    ["YouTube", youTubeIcon],
    ["Spotify", spotifyIcon],
    ["Amazon", amazonMusicIcon]
])

function Link(props) {
//⇔⇒
	const { colors } = useTheme();
	const styles = theme_styles(colors);

    const [fromIcon, setFromIcon] = useState(props.fromIcon || "None");
    const [fromText, setFromText] = useState(props.fromText || "");
    const [biDirectional, setBiDirectional] = useState(props.biDirectional || false);
    const [toIcon, setToIcon] = useState(props.toIcon || "None");
    const [toText, setToText] = useState(props.toText || "");

	return(
        <>        
            <View style={{backgroundColor: colors.track, width: '100%', height: 50, alignItems: 'center', flexDirection: 'row'}}>
                {(fromIcon == "None" || fromIcon == "Illusi") && <Image source={icons.get(fromIcon)} style={{left: 5, width: 40, height: 40, borderRadius: 5}}/>}
                {!(fromIcon == "None" || fromIcon == "Illusi") && <Image source={{uri: icons.get(fromIcon)}} style={{left: 5, width: 40, height: 40, borderRadius: 5}}/>}
                <Text style={{color:'#FFFFFF', left: 10, width: "30%"}} numberOfLines={1}>{fromText}</Text>
                <Text style={{color:'#FFFFFF', left: 8, fontWeight: 'bold', width: 30, fontSize: 25}}>{biDirectional ? "⇔" : "⇒"}</Text>
                {(toIcon == "None" || toIcon == "Illusi") && <Image source={icons.get(toIcon)} style={{left: 5, width: 40, height: 40, borderRadius: 5}}/>}
                {!(toIcon == "None" || toIcon == "Illusi") && <Image source={{uri: icons.get(toIcon)}} style={{left: 5, width: 40, height: 40, borderRadius: 5}}/>}
                <Text style={{color:'#FFFFFF', left: 10, width: "37%"}} numberOfLines={1}>{toText}</Text>
            </View>
            <View style={{backgroundColor: colors.track, width: '100%', height: 35, alignItems: 'center', flexDirection: 'row'}}>
                
            </View>
            <View style={styles.linelong}/>
        </>
	);
}
const theme_styles = (colors) => StyleSheet.create({
    linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.2,
		backgroundColor: 'white',
	},
    container: {
        backgroundColor: 'white',
        padding: 16,
        width: 500
      },
      dropdown: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        paddingHorizontal: 8,
        width: 200
      },
      icon: {
        marginRight: 5,
      },
      label: {
        position: 'absolute',
        backgroundColor: 'white',
        left: 22,
        top: 8,
        zIndex: 999,
        paddingHorizontal: 8,
        fontSize: 14,
      },
      placeholderStyle: {
        fontSize: 16,
      },
      selectedTextStyle: {
        fontSize: 16,
      },
      iconStyle: {
        width: 20,
        height: 20,
      },
      inputSearchStyle: {
        height: 40,
        fontSize: 16,
      },
  
});
export default Link;