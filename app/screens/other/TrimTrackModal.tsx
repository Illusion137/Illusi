
import React,  { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as SQLfs from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_fs';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import { SetState, Track } from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import Trimmer from 'react-native-trimmer';
import {
    PlayerState,
    Waveform,
    type IWaveformRef,
} from '@simform_solutions/react-native-audio-waveform';
import { artist_string } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { Ionicons } from '@expo/vector-icons';
import { round_decimal_place } from '../../../lib-origin/origin/src/utils/util';
  

type ModalData = {show: boolean, track_data: Track|null};
export default function TrimTrackModal(props: {
    modal_data: ModalData,
    set_modal_data: SetState
    callback: () => void,
}) {
    const { colors } = useTheme() as Prefs.Theme;
    const styles = theme_styles(colors); styles;

    const [left_trim, set_left_trim] = useState(0);
    const [right_trim, set_right_trim] = useState(1);
    const [scrubber, set_scrubber] = useState(0);

    const [playerstate, set_playerstate] = useState<PlayerState>(PlayerState.stopped);

    const waveform_ref = useRef<IWaveformRef>(null);
    useEffect(() => {
        set_left_trim(props.modal_data.track_data?.meta?.begdur ?? 0);
        set_right_trim(props.modal_data.track_data?.meta?.enddur ?? props.modal_data.track_data?.duration ?? 1);
    }, [props.modal_data.track_data])

    async function save_selection(){
        let update = false;
        if(!isNaN(left_trim)){
            props.modal_data.track_data!.meta!.begdur = left_trim;
            update = true;
        }
        if(!isNaN(right_trim)){
            props.modal_data.track_data!.meta!.enddur = right_trim;
            update = true;
        }
        if(update) {
            await SQLTracks.update_track_meta_data(props.modal_data.track_data!.uid, props.modal_data.track_data!.meta!);
        }
        props.set_modal_data({'show':false, 'track_data': null});
        waveform_ref.current?.pausePlayer();
    }

    return(
        <Modal
        animationType="slide"
        visible={props.modal_data.show}
        presentationStyle={'pageSheet'}
        onShow={async() => {}}
        onRequestClose={() => {
            waveform_ref.current?.pausePlayer();
            props.set_modal_data({'show':false, 'track_data': null});
        }}>
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button color={colors.primary} title={'Cancel'} onPress={() => {
                        props.set_modal_data({'show':false, 'track_data': null});
                        waveform_ref.current?.pausePlayer();
                    }}/>
                    <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '40%'}}>Trim Track</Text>
                </View>
                <Text numberOfLines={1} style={{marginHorizontal: 20, top: 8, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{props.modal_data.track_data?.title || ""}</Text>
                <Text style={{marginHorizontal: 20, top: 6, color: colors.text, fontSize: 14}}>{artist_string(props.modal_data.track_data!)}</Text>
                <View style={{height: 10}}/>
                <Trimmer
                    onHandleChange={({leftPosition, rightPosition}) => {
                        set_left_trim(leftPosition / 1000);
                        set_right_trim(rightPosition / 1000);
                    }}
                    totalDuration={(props.modal_data.track_data?.duration ?? 10) * 1000}
                    trimmerLeftHandlePosition={left_trim * 1000}
                    trimmerRightHandlePosition={right_trim * 1000}
                    maximumZoomLevel={1}
                    initialZoomValue={1}
                    scaleInOnInit={true}
                    maxTrimDuration={(props.modal_data.track_data?.duration ?? 10) * 1000}
                    tintColor={colors.secondary}
                    markerColor={colors.secondary}
                    trackBackgroundColor={colors.primary}
                    trackBorderColor={colors.secondary}
                    scrubberColor={colors.text}
                    scaleInOnInitType={"max-duration"}
                    scrubberPosition={scrubber}
                />
                {props.modal_data.track_data?.media_uri !== undefined ?             
                    <Waveform
                        mode="static"
                        ref={waveform_ref}
                        path={SQLfs.media_directory(props.modal_data.track_data?.media_uri)}
                        candleSpace={1}
                        candleWidth={1}
                        candleHeightScale={10}
                        scrubColor={colors.secondary}
                        waveColor={colors.text}
                        containerStyle={{height: 100}}
                        onPlayerStateChange={player_state => set_playerstate(player_state)}
                        onCurrentProgressChange={scrubber_position => set_scrubber(round_decimal_place(scrubber_position, 2))}
                    /> : null
                }
                <View style={{height: 70}}/>
                <TouchableOpacity onPress={() => {playerstate === PlayerState.playing ? waveform_ref.current?.pausePlayer() : waveform_ref.current?.startPlayer();}} style={{alignSelf: 'center', bottom: 50}}>
                    <Ionicons name={playerstate === PlayerState.playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary} />
                </TouchableOpacity>
                <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity style={{width: '48%', alignSelf: 'center', height: 60, backgroundColor: colors.primary, borderRadius: 10, bottom: 30, alignItems: 'center', justifyContent: 'center', margin: "1%"}} onPress={() => set_left_trim(round_decimal_place(scrubber / 1000, 2))}>
                        <Text style={{color: colors.text, fontSize: 24, fontWeight: '600'}}>Set Position Left</Text> 
                    </TouchableOpacity>
                    <TouchableOpacity style={{width: '48%', alignSelf: 'center', height: 60, backgroundColor: colors.primary, borderRadius: 10, bottom: 30, alignItems: 'center', justifyContent: 'center', margin: "1%"}} onPress={() => set_right_trim(round_decimal_place(scrubber / 1000, 2))}>
                        <Text style={{color: colors.text, fontSize: 24, fontWeight: '600'}}>Set Position Right</Text> 
                    </TouchableOpacity>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity style={{width: '48%', alignSelf: 'center', height: 40, backgroundColor: colors.primary, borderRadius: 5, bottom: 30, alignItems: 'center', justifyContent: 'center', margin: "1%"}} onPress={() => set_left_trim(0)}>
                        <Text style={{color: colors.text, fontSize: 20, fontWeight: '600'}}>Reset Position Left</Text> 
                    </TouchableOpacity>
                    <TouchableOpacity style={{width: '48%', alignSelf: 'center', height: 40, backgroundColor: colors.primary, borderRadius: 5, bottom: 30, alignItems: 'center', justifyContent: 'center', margin: "1%"}} onPress={() => set_right_trim(props.modal_data.track_data?.duration ?? 1)}>
                        <Text style={{color: colors.text, fontSize: 20, fontWeight: '600'}}>Reset Position Right</Text> 
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={{width: '90%', alignSelf: 'center', height: 60, top: "10%", backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: 'center', justifyContent: 'center'}} onPress={async() => save_selection()}>
                    <Text style={{color: colors.text, fontSize: 24, fontWeight: '600'}}>Save Trimming</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
const theme_styles = (_: Prefs.Theme['colors']) => StyleSheet.create({

});