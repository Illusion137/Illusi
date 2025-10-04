import React from 'react';
import { Text, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { is_empty } from '@common/utils/util';
import { useNavigation } from '@react-navigation/native';
import { Navigator } from '@illusive/illusi/src/types';

export default function NavLink(props: {
    text: string
	uri: string
    type: "album"|"playlist"|"artist"
    text_style: StyleProp<TextStyle>
    callforward?: () => void
}) {
	const navigation: Navigator = useNavigation();

	// const { colors } = usePTheme();
	// const styles = theme_styles(colors);

    async function navigate(){
        if(is_empty(props.uri)) return;
        props?.callforward?.();
        switch(props.type){
            case "album":
            case "playlist": {
        		navigation.navigate('My Library', {screen: 'Playlist', params: {uri: props.uri}}); 
                break; 
            }
            case "artist": {
        		navigation.navigate('My Library', {screen: 'Artist', params: {uri: props.uri}}); 
                break;
            }
        }
    }

	return(
        <TouchableOpacity disabled={is_empty(props.uri)} onPress={navigate} hitSlop={5}>
            <Text style={props.text_style} numberOfLines={1}>{props.text}</Text>
        </TouchableOpacity>
	);
}
// const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
// });