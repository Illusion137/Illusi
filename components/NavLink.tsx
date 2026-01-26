import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, TouchableOpacity } from 'react-native';
import { is_empty } from '@common/utils/util';
import { SharedRouter } from '@utils/shared_routes';

export default function NavLink(props: {
    text: string
	uri: string
    type: "album"|"playlist"|"artist"
    text_style: StyleProp<TextStyle>
    callforward?: () => void
}) {
	// const { colors } = usePTheme();
	// const styles = theme_styles(colors);

    async function navigate(){
        if(is_empty(props.uri)) return;
        props?.callforward?.();
        switch(props.type){
            case "album":
            case "playlist": {
                SharedRouter.goto_shared_playlist( props.uri, "URI", {} );
                break; 
            }
            case "artist": {
                SharedRouter.goto_shared_artist( props.uri );
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