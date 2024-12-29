import { View, Image, ImageSourcePropType } from "react-native";
import { Track } from '../../lib-origin/Illusive/src/types';
import { is_empty } from '../../lib-origin/origin/src/utils/util';

export default function FourTrackArtwork(props: {
    four_track: Track[]
    size: number
    dim?: boolean
    thumbnail_uri?: string
}) {
    return (
        <>
            {!is_empty(props.thumbnail_uri) && <Image source={{"uri": props.thumbnail_uri}} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5 }}/>}
            {props.four_track.length == 0 && is_empty(props.thumbnail_uri) && <Image source={require('../../assets/notfound.png')} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5 }}/>}
            {props.four_track.length !== 0 && is_empty(props.thumbnail_uri) && props.four_track.length < 4 && <Image source={props.four_track[0].playback!.artwork as ImageSourcePropType} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5 }}/>}
            {props.four_track.length >= 4 && is_empty(props.thumbnail_uri) && <View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[0] != undefined && <Image source={props.four_track[0].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopLeftRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                    {props.four_track[1] != undefined && <Image source={props.four_track[1].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopRightRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[2] != undefined && <Image source={props.four_track[2].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomLeftRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                    {props.four_track[3] != undefined && <Image source={props.four_track[3].playback!.artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomRightRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                </View>
            </View>}
        </>
    )
}