import { Image, Text, TouchableOpacity } from "react-native";
import { CompactArtist } from "../../lib-origin/Illusive/src/types";
import { useNavigation, useTheme } from "@react-navigation/native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Navigator } from "../../lib-origin/Illusive/src/illusi/src/types";
import { remove_topic } from '../../lib-origin/origin/src/utils/util';

export default function RowArtist(props: {
    artist_data: CompactArtist;
    size?: number 
}){
    const { colors } = useTheme() as Prefs.Theme;

    const navigation: Navigator = useNavigation();
    
    function on_press(){
        navigation.push("Artist", {uri: props.artist_data.name.uri})
    }

    const size = props.size ?? 100;

    return (
        <TouchableOpacity onPress={on_press} style={{padding: 10, alignItems: 'center'}}>
            <Image source={{uri: props.artist_data.profile_artwork_url}} style={{width: size, height: size, borderRadius: size}}/>
            <Text numberOfLines={1} style={{color: colors.text, top: 5, fontSize: 14, fontWeight: '600', maxWidth: size}}>{remove_topic(props.artist_data.name.name)}</Text>
        </TouchableOpacity>
    );
}