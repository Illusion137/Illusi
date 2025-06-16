import { View, Image, ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import { Track } from '../../lib-origin/Illusive/src/types';
import { is_empty } from '../../lib-origin/origin/src/utils/util';
import { custom_thumbnail_directory } from "../../lib-origin/Illusive/src/illusi/src/sql/sql_fs";

export default function FourTrackArtwork(props: {
    four_track: Track[]
    size: number
    dim?: boolean
    background?: boolean
    dim_amount?: number
    thumbnail_uri?: string
    base_view_style?: StyleProp<ViewStyle>
}) {
    const background = (props.background ?? false);
    const thumbnail_uri = props.thumbnail_uri?.includes("https:") ? props.thumbnail_uri : custom_thumbnail_directory(props.thumbnail_uri!);
    const all_same_album = new Set(props.four_track.map(track => track.album?.name).filter(uri => !is_empty(uri))).size === 1;
    return (
        <View style={{...props.base_view_style as object, backgroundColor: "black", borderRadius: 5, position: background ? 'absolute' : undefined, zIndex: background ? -1 : undefined}}>
            {!is_empty(props.thumbnail_uri) && <Image source={{"uri": thumbnail_uri}} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length == 0 && is_empty(props.thumbnail_uri) && <Image source={require('../../assets/notfound.png')} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length !== 0 && is_empty(props.thumbnail_uri) && props.four_track.length < 4 && <Image source={props.four_track[0].playback!.artwork as ImageSourcePropType} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length >= 4 && is_empty(props.thumbnail_uri) && all_same_album && <Image source={props.four_track[0].playback!.artwork as ImageSourcePropType} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length >= 4 && is_empty(props.thumbnail_uri) && !all_same_album && <View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[0] != undefined && <Image source={props.four_track[0].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopLeftRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                    {props.four_track[1] != undefined && <Image source={props.four_track[1].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopRightRadius: 5 ,opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[2] != undefined && <Image source={props.four_track[2].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomLeftRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                    {props.four_track[3] != undefined && <Image source={props.four_track[3].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomRightRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                </View>
            </View>}
        </View>
    )
}