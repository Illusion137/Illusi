import { useNavigation, useTheme } from "@react-navigation/native";
import { CompactPlaylist } from "../../lib-origin/Illusive/src/types";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { empty_join_dot } from "../../lib-origin/origin/src/utils/util";
import { Navigator } from "../../lib-origin/Illusive/src/illusi/src/types";

export default function LatestRelease(props: {album_data: CompactPlaylist}){
    const { colors } = useTheme() as Prefs.Theme;
    const navigation: Navigator = useNavigation();

    function on_press(){
        navigation.push("Playlist", {uri: props.album_data.title.uri})
    }

    return (
        <TouchableOpacity onPress={on_press} style={{backgroundColor: colors.shelf, width: '90%', height: 90, alignSelf: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between'}}>
            <View>
                <Text style={{color: colors.subtext, fontSize: 16, fontWeight: '700', paddingLeft: 8, paddingTop: 8}}>Latest Release</Text>
                <Text style={{color: colors.text, fontSize: 14, fontWeight: 'bold', paddingLeft: 10, paddingTop: 8}}>{props.album_data.title.name}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', paddingLeft: 9}}>
                    <MaterialIcons name="explicit" size={20} color={colors.secondary} style={{}}/>
                    <Text style={{color: colors.subtext, fontSize: 14, fontWeight: '400', top: 1, left: 2}}>{empty_join_dot(["Album", props.album_data.artist.map(item => item.name).join(', ')])}</Text>
                </View>
            </View>
            <Image source={{uri: props.album_data.artwork_url}} style={{width: 70, height: 70, right: 10, borderRadius: 3, alignSelf: 'center'}}/>
        </TouchableOpacity>
    );
}