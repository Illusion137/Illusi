import { Text, TouchableOpacity } from "react-native";
import { CompactArtist } from "@illusive/types";
import { useNavigation } from "@react-navigation/native";
import { Navigator } from "@illusive/illusi/src/types";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import { remove_topic } from "@common/utils/clean_util";

export default function RowArtist(props: {
    artist_data: CompactArtist;
    size?: number 
}){
    const { colors } = usePTheme();

    const navigation: Navigator = useNavigation();
    
    function on_press(){
        navigation.push("Artist", {uri: props.artist_data.name.uri})
    }

    const size = props.size ?? 100;

    return (
        <TouchableOpacity onPress={on_press} style={{padding: 10, alignItems: 'center'}}>
            <IImage source={props.artist_data.profile_artwork_url} style={{width: size, height: size, borderRadius: size}}/>
            <Text numberOfLines={1} style={{color: colors.text, top: 5, fontSize: 14, fontWeight: '600', maxWidth: size}}>{remove_topic(props.artist_data.name.name)}</Text>
        </TouchableOpacity>
    );
}