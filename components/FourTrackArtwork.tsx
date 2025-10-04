import { View, StyleProp, ViewStyle } from "react-native";
import { Track } from '@illusive/types';
import { is_empty } from "@common/utils/util";
import { SQLfs } from "@illusive/sql/sql_fs";
import IImage from "./IImage";

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
    const thumbnail_uri = props.thumbnail_uri?.includes("https:") ? props.thumbnail_uri : SQLfs.custom_thumbnail_directory(props.thumbnail_uri!);
    const album_names = (props.four_track ?? []).map(track => track.album?.name ?? "").filter(name => !is_empty(name));
    const all_same_album = (new Set<string>(album_names).size === 1 && album_names.length >= 4) || (props.four_track.length >= 4 && props.four_track.slice(0,4).every(track => !is_empty(track.imported_id)));
    
    return (
        <View style={{...props.base_view_style as object, backgroundColor: "black", borderRadius: 5, position: background ? 'absolute' : undefined, zIndex: background ? -1 : undefined}}>
            {!is_empty(thumbnail_uri) && <IImage source={thumbnail_uri} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length == 0 && is_empty(thumbnail_uri) && <IImage source={undefined} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length !== 0 && is_empty(thumbnail_uri) && props.four_track.length < 4 && <IImage source={props.four_track[0].playback?.artwork} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length >= 4 && is_empty(thumbnail_uri) && all_same_album && <IImage source={props.four_track[0].playback?.artwork} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1 }}/>}
            {props.four_track.length >= 4 && is_empty(thumbnail_uri) && !all_same_album && <View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[0] != undefined && <IImage source={props.four_track[0].playback?.artwork} style={{width: props.size, height: props.size, borderTopLeftRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                    {props.four_track[1] != undefined && <IImage source={props.four_track[1].playback?.artwork} style={{width: props.size, height: props.size, borderTopRightRadius: 5 ,opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[2] != undefined && <IImage source={props.four_track[2].playback?.artwork} style={{width: props.size, height: props.size, borderBottomLeftRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                    {props.four_track[3] != undefined && <IImage source={props.four_track[3].playback?.artwork} style={{width: props.size, height: props.size, borderBottomRightRadius: 5, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1}}/>}
                </View>
            </View>}
        </View>
    )
}