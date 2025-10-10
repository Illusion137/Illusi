import TrackComponentBase from "@components/TrackComponentBase";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import type { Track } from "@illusive/types";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, TouchableOpacity, View } from "react-native";
import { SwipeListView } from "react-native-swipe-list-view";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";

export default function AudioPlayerQueue(){
    const { colors } = usePTheme();

    const [queue_data, set_queue_data] = useState<Track[]>([]);

    const render_now_playing_item = (item: { item: Track }) => <TrackComponentBase 
        track_data={item.item}
        on_press={() => {}} 
        on_long_press={() => {}} 
        disabled={true} />;    

    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }
    
    async function updated_queue_items() {
        const current_track_index = await TrackPlayer.getActiveTrackIndex();
        if(current_track_index === undefined) return;
        const track_player_queue = GLOBALS.global_var.playing_tracks.slice(current_track_index!);
        set_queue_data(track_player_queue);
    }

    async function remove_track_from_queue(item: Track){
        const current_track_index = await TrackPlayer.getActiveTrackIndex();
        if(current_track_index === undefined) return;
        const global_index = GLOBALS.global_var.playing_tracks.slice(current_track_index).findIndex(track => track.uid === item.uid);
        if(global_index !== -1){
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            GLOBALS.global_var.playing_tracks.splice(current_track_index + global_index, 1);
            const tp_queue = await TrackPlayer.getQueue();
            const tp_index = tp_queue.findIndex((track, i) => track.title === item.title && i >= current_track_index);
            if(tp_index !== -1) await TrackPlayer.remove([tp_index]);
        }
    }

    useEffect(() => {
        updated_queue_items();
    },[]);

    useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackActiveTrackChanged, Event.PlaybackState], async(event) => {
        if(event.type === Event.PlaybackActiveTrackChanged){
            if(event.index === undefined) return;
            await updated_queue_items();
        }
    });

    return (
        <>
            <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                <View style={{ marginLeft: 10 }}>
                    <Button color={colors.primary} title='close' onPress={close} />
                </View>
                <Text style={{ left: 85, color: colors.text, fontWeight: "bold", fontSize: 17 }}>Up Next</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <SwipeListView
                    data={queue_data.slice(1)}
                    renderItem={render_now_playing_item}
                    ListHeaderComponent={() =>
                        <View style={{ flex: 1, width: '100%', height: 140 }}>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', padding: 10 }}>Now Playing</Text>
                            {queue_data[0] ? render_now_playing_item({item: queue_data[0]}) : null}
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', padding: 10 }}>Up Next</Text>
                        </View>
                    }
                    renderHiddenItem={({item}) => (
                        <TouchableOpacity onPress={async () => remove_track_from_queue(item)} style={{ backgroundColor: "#8B0000", flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
                            <Ionicons name='trash-bin' style={{right: 10}} color={"white"} size={22} />
                        </TouchableOpacity>
                    )}
                    rightOpenValue={-75}
                    rightActionValue={-80}
                    rightActivationValue={-80}
                    disableRightSwipe
                />
            </View>
        </>
    );
}