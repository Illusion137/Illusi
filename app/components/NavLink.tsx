import React from 'react';
import { Text, StyleSheet, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { is_empty } from '../../lib-origin/origin/src/utils/util';
import { split_uri } from '../../lib-origin/Illusive/src/illusive_utilts';


export default function NavLink(props: {
    text: string
	uri: string
    text_style: StyleProp<TextStyle>
    callforward?: () => Promise<void>
    callback?: () => Promise<void>
}) {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

    async function navigate(){
        if(is_empty(props.uri)) return;
        if(props.callforward !== undefined) await props.callforward();

        const parsed_uri = split_uri(props.uri);
        switch(parsed_uri[1]){
            case "album":
            case "playlist": {
                navigation.navigate("Playlist", {"uri": props.uri});                
                break; 
            }
            case "artist": {
                navigation.navigate("Artist", {"uri": props.uri});
                break;
            }
        }

        if(props.callback !== undefined) await props.callback();
    }

	return(
        <TouchableOpacity onPress={navigate} hitSlop={5}>
                <Text style={props.text_style} numberOfLines={1}>{props.text}</Text>
        </TouchableOpacity>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({

});