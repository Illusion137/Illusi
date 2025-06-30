
import React,  { useState } from 'react';
import { View, Text, StyleSheet, Button, Modal, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { SetState, Track } from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { artist_string, duration_to_string } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { is_empty, milliseconds_of } from '../../../lib-origin/origin/src/utils/util';
import ScaledImage from '../../components/ScaledImage';
  

type ModalData = {show: boolean, track_data: Track|null};
export default function TrackInfoModal(props: {
    modal_data: ModalData,
    set_modal_data: SetState
    callback: () => void,
}) {
    const { colors } = useTheme() as Prefs.Theme;
    const styles = theme_styles(colors); styles;
    const unknown = "Unknown";

    const [tint_size, set_tint_size] = useState<{width: number, height: number}>({width: 0, height: 0});
    const tint = GLOBALS.global_var.tint_table.get(props.modal_data.track_data?.uid ?? "");

    function date_string(isostring?: string){
        const date = new Date(isostring ?? 0);
        if(date.getTime() <= milliseconds_of({years: 30})) return unknown;
        return date.toDateString();
    }

    const data: [string, any][] = [
        ["Added Date", date_string(props.modal_data.track_data?.meta?.added_date)],
        ["Downloaded Date", date_string(props.modal_data.track_data?.meta?.downloaded_date)],
        ["Last Played Date", date_string(props.modal_data.track_data?.meta?.last_played_date)],
        ["Last Sampled Date", date_string(props.modal_data.track_data?.meta?.last_sampled_date)],
        ["Age Restricted", String(props.modal_data.track_data?.meta?.age_restricted ?? unknown)],
        ["Unavailable", String(props.modal_data.track_data?.meta?.unavailable ?? unknown)],
        ["Track Range", `${duration_to_string(props.modal_data.track_data?.meta?.begdur ?? 0).duration} - ${duration_to_string(props.modal_data.track_data?.meta?.enddur ?? (props.modal_data.track_data?.duration ?? 0)).duration}`],
        ["Songs", JSON.stringify(props.modal_data.track_data?.meta?.songs ?? [])],
        ["Chapters", JSON.stringify(props.modal_data.track_data?.meta?.chapters ?? [])],
        ["Plays", String(props.modal_data.track_data?.meta?.plays)],
    ]

    return(
        <Modal
        animationType="slide"
        visible={props.modal_data.show}
        presentationStyle={'pageSheet'}
        onShow={async() => {}}
        onRequestClose={() => {
            props.set_modal_data({'show':false, 'track_data': null});
        }}>
            <View style={{flex: 1, backgroundColor: colors.background}}>
                {props.modal_data.show ? (
                <>
                <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button color={colors.primary} title={'Close'} onPress={() => {
                        props.set_modal_data({'show':false, 'track_data': null});
                    }}/>
                    <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '40%'}}>Track Info</Text>
                </View>
                <ScrollView>
                    <View style={{width: '100%', alignItems: 'center', maxHeight: 450, minHeight: 350, overflow: 'hidden'}}>
                        <View style={{flexGrow: 1, height: 50}}/>
                        <ScaledImage set_size={set_tint_size} artwork={props.modal_data.track_data?.playback?.artwork ?? 0} width={Dimensions.get('screen').width * .8} style={{ maxHeight: Dimensions.get('screen').height / 2, maxWidth: Dimensions.get('screen').width - 20, height: undefined, width: Dimensions.get('screen').width - 20, borderRadius: 10}}/>
                        {is_empty(tint) ? null : <View style={{top: 50, borderRadius: 10, width: tint_size.width, height: tint_size.height, opacity: 0.15, position: 'absolute', backgroundColor: tint}}/>}
                    </View>
                    <Text numberOfLines={1} style={{marginHorizontal: 40, top: 8, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{props.modal_data.track_data?.title || ""}</Text>
                    <Text style={{...styles.text_base, marginHorizontal: 40, top: 6}}>{artist_string(props.modal_data.track_data!)}</Text>
                    <Text style={{...styles.text_base, marginHorizontal: 40, top: 6}}>{props.modal_data.track_data?.album?.name}</Text>
                    <View style={{height: 10}}/>
                    {
                        data.map((item, i) => (
                            <View key={i + item[0]} style={{flexDirection: 'row', width: '100%', justifyContent: 'space-evenly'}}>
                                <Text style={{...styles.text_base}}>{item[0]}</Text>
                                <Text style={{...styles.text_base}}>{item[1]}</Text>
                            </View>
                        ))
                    }
                </ScrollView>
                </>) : null}
            </View>
        </Modal>
    );
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    text_base: {
        color: colors.text, 
        fontSize: 14
    }
});