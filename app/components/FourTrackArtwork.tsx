import { NavigationProp, useTheme } from '@react-navigation/native';
import { View, Text, TouchableHighlight, Image, StyleSheet, ImageSourcePropType, Alert } from "react-native";
import { Track } from '../../types';

export default function FourTrackArtwork(props: {
    four_track: Track[]
    size: number
    dim?: boolean
}) {

    return (
        <>
            {props.four_track.length == 0 && <Image source={require('../../assets/notfound.png')} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5 }}/>}
            {props.four_track.length !== 0 && props.four_track.length < 4 && <Image source={props.four_track[0].artwork as ImageSourcePropType} style={{ width: props.size * 2, height: props.size * 2, borderRadius: 5 }}/>}
            {props.four_track.length >= 4 && <View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[0] != undefined && <Image source={props.four_track[0].artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopLeftRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                    {props.four_track[1] != undefined && <Image source={props.four_track[1].artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderTopRightRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {props.four_track[2] != undefined && <Image source={props.four_track[2].artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomLeftRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                    {props.four_track[3] != undefined && <Image source={props.four_track[3].artwork as ImageSourcePropType} style={{width: props.size, height: props.size, borderBottomRightRadius: 5,opacity: props.dim ?  0.8 : 1}}/>}
                </View>
            </View>}
        </>
    )
}