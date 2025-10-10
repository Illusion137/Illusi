import { GLOBALS } from "@illusive/globals";
import { router, useLocalSearchParams } from "expo-router";
import React,  { useState, useEffect, useRef } from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import Trimmer from 'react-native-trimmer';
import {
    PlayerState,
    Waveform,
    type IWaveformRef,
} from '@simform_solutions/react-native-audio-waveform';
import { artist_string } from '@illusive/illusive_utils';
import { Ionicons } from '@expo/vector-icons';
import usePTheme from '@hooks/usePTheme';
import { SQLfs } from '@illusive/sql/sql_fs';
import { round_decimal_place } from '@common/utils/util';
import { SQLTracks } from '@illusive/sql/sql_tracks';

export default function EditTrackModal(){
    const { uid } = useLocalSearchParams<{uid: string}>();
    const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));
    
    const { colors } = usePTheme();

    const [left_trim, set_left_trim] = useState(0);
    const [right_trim, set_right_trim] = useState(1);
    const [scrubber, set_scrubber] = useState(0);

    const [playerstate, set_playerstate] = useState<PlayerState>(PlayerState.stopped);

    const waveform_ref = useRef<IWaveformRef>(null);
    useEffect(() => {
        set_left_trim(track_ref.current?.meta?.begdur ?? 0);
        set_right_trim(track_ref.current?.meta?.enddur ?? track_ref.current?.duration ?? 1);
    }, [track_ref.current])

    function close(){
        if(!router.canDismiss()) return;
        waveform_ref.current?.pausePlayer();
        router.dismiss();
    }

    async function save_selection(){
        let update = false;
        if(!isNaN(left_trim)){
            track_ref.current!.meta!.begdur = left_trim;
            update = true;
        }
        if(!isNaN(right_trim)){
            track_ref.current!.meta!.enddur = right_trim;
            update = true;
        }
        if(update) {
            await SQLTracks.update_track_meta_data(track_ref.current!.uid, track_ref.current!.meta!);
        }
        close();
    }

    return(
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Button color={colors.primary} title={'Cancel'} onPress={close}/>
                <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '40%'}}>Trim Track</Text>
            </View>
            <Text numberOfLines={1} style={{marginHorizontal: 20, top: 8, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{track_ref.current?.title || ""}</Text>
            <Text style={{marginHorizontal: 20, top: 6, color: colors.text, fontSize: 14}}>{artist_string(track_ref.current!)}</Text>
            <View style={{height: 10}}/>
            <Trimmer
                onHandleChange={({leftPosition, rightPosition}) => {
                    set_left_trim(leftPosition / 1000);
                    set_right_trim(rightPosition / 1000);
                }}
                totalDuration={(track_ref.current?.duration ?? 10) * 1000}
                trimmerLeftHandlePosition={left_trim * 1000}
                trimmerRightHandlePosition={right_trim * 1000}
                maximumZoomLevel={1}
                initialZoomValue={1}
                scaleInOnInit={true}
                maxTrimDuration={(track_ref.current?.duration ?? 10) * 1000}
                tintColor={colors.secondary}
                markerColor={colors.secondary}
                trackBackgroundColor={colors.primary}
                trackBorderColor={colors.secondary}
                scrubberColor={colors.text}
                scaleInOnInitType={"max-duration"}
                scrubberPosition={scrubber}
            />
            {track_ref.current?.media_uri !== undefined ?             
                <Waveform
                    mode="static"
                    ref={waveform_ref}
                    path={SQLfs.media_directory(track_ref.current?.media_uri)}
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
                <TouchableOpacity style={{width: '48%', alignSelf: 'center', height: 40, backgroundColor: colors.primary, borderRadius: 5, bottom: 30, alignItems: 'center', justifyContent: 'center', margin: "1%"}} onPress={() => set_right_trim(track_ref.current?.duration ?? 1)}>
                    <Text style={{color: colors.text, fontSize: 20, fontWeight: '600'}}>Reset Position Right</Text> 
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={{width: '90%', alignSelf: 'center', height: 60, top: "10%", backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: 'center', justifyContent: 'center'}} onPress={async() => save_selection()}>
                <Text style={{color: colors.text, fontSize: 24, fontWeight: '600'}}>Save Trimming</Text>
            </TouchableOpacity>
        </View>
    );
}