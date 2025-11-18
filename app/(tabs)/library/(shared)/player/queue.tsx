import ModalHeader from "@components/ModalHeader";
import TrackComponentBase from "@components/TrackComponentBase";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { delete_track_from_player_queue } from "@illusive/track_player_service";
import type { Track } from "@illusive/types";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

    async function updated_queue_items() {
        const current_track_index = await TrackPlayer.getActiveTrackIndex();
        if(current_track_index === undefined) return;
        const track_player_queue = GLOBALS.global_var.playing_tracks.slice(current_track_index);
        set_queue_data(track_player_queue);
    }

    async function remove_track_from_queue(item: Track){
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        await delete_track_from_player_queue(item);
        updated_queue_items();
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
            <ModalHeader title={queue_data .length > 50 ? "Up Next (Truncated)" : "Up Next"}/>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <SwipeListView
                    data={queue_data.slice(1, 50)}
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