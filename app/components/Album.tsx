import { useNavigation, useTheme } from "@react-navigation/native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { CompactPlaylist } from "../../lib-origin/Illusive/src/types";
import { best_thumbnail, empty_join_dot, single_case } from '../../lib-origin/Illusive/src/illusive_utilts';
import { Navigator } from "../../lib-origin/Illusive/src/illusi/src/types";

export type SecondLineType = "YEAR"|"ARTIST";
export default function Album(props: {
    album_data: CompactPlaylist
    second_line_type?: SecondLineType
}){
    const size = Dimensions.get('screen').width * .40;
    const { colors } = useTheme() as Prefs.Theme;

    const navigation: Navigator = useNavigation();

    function on_press(){
        navigation.push("Playlist", {uri: props.album_data.title.uri, compact_playlist: props.album_data});;
    }

    function on_hold(){

    }

    const year = new Date(props.album_data.date ?? 0).getFullYear();
    const artist_name = props.album_data.artist?.[0]?.name;
    const second_line = ((props.second_line_type ?? "YEAR") === "YEAR") ? (year ?? artist_name) : (artist_name ?? year);

    return (
        <TouchableOpacity style={{padding: 5}} onPress={on_press} onLongPress={on_hold}>
            <Image source={{uri: props.album_data.artwork_url ?? best_thumbnail(props.album_data.artwork_thumbnails)?.url}} style={{width: size, height: size, borderRadius: 5}}/>
            <View style={{width: size}}>
                <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 16, paddingTop: 5, width: size}} numberOfLines={1}>{props.album_data.title.name}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {props.album_data.explicit === "EXPLICIT" ? <MaterialIcons name="explicit" size={20} color={colors.secondary} style={{}}/> : null}
                    <Text numberOfLines={1} style={{color: colors.subtext, fontSize: 15, top: 0}}>{empty_join_dot([single_case(props.album_data.album_type ?? ""), second_line])}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}