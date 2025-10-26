import { CompactPlaylist } from "@illusive/types";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { empty_join_dot } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import { SharedRouter } from '../utils/shared_routes';

export default function LatestRelease(props: {album_data: CompactPlaylist}){
    const { colors } = usePTheme();

    function on_press(){
        SharedRouter.goto_shared_playlist( props.album_data.title.uri ?? "", "URI", {} );
    }

    return (
        <TouchableOpacity onPress={on_press} style={{backgroundColor: colors.shelf, width: Dimensions.get('screen').width - 20, height: 90, alignSelf: 'center', borderRadius: 3, flexDirection: 'row', justifyContent: 'space-between', borderColor: colors.line, borderWidth: 1}}>
            <View>
                <Text style={{color: colors.subtext, fontSize: 16, fontWeight: '700', paddingLeft: 8, paddingTop: 12}}>Latest Release</Text>
                <Text style={{color: colors.text, fontSize: 14, fontWeight: 'bold', paddingLeft: 10, paddingTop: 4}}>{props.album_data.title.name}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', paddingLeft: 9}}>
                    <MaterialIcons name="explicit" size={20} color={colors.secondary} style={{}}/>
                    <Text style={{color: colors.subtext, fontSize: 14, fontWeight: '400', top: 1, left: 2}}>{empty_join_dot(["Album", props.album_data.artist.map(item => item.name).join(', ')])}</Text>
                </View>
            </View>
            <IImage source={props.album_data.artwork_url} style={{width: 70, height: 70, right: 10, borderRadius: 3, alignSelf: 'center'}}/>
        </TouchableOpacity>
    );
}