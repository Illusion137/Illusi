import { is_empty, milliseconds_of } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";

export default function EditTrackModal(){
    const { uid } = useLocalSearchParams<{uid: string}>();
    const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));
    
    const { colors } = usePTheme();
    const styles = theme_styles(colors); styles;
    const unknown = "Unknown";

    const [tint_size, set_tint_size] = useState<{width: number, height: number}>({width: 0, height: 0});
    const tint = GLOBALS.global_var.tint_table.get(track_ref.current?.uid ?? "");

    function date_string(isostring?: string){
        const date = new Date(isostring ?? 0);
        if(date.getTime() <= milliseconds_of({years: 30})) return unknown;
        return date.toDateString();
    }

    const data: [string, any][] = [
        ["Added Date", date_string(track_ref.current?.meta?.added_date)],
        ["Downloaded Date", date_string(track_ref.current?.meta?.downloaded_date)],
        ["Last Played Date", date_string(track_ref.current?.meta?.last_played_date)],
        ["Last Sampled Date", date_string(track_ref.current?.meta?.last_sampled_date)],
        ["Age Restricted", String(track_ref.current?.meta?.age_restricted ?? unknown)],
        ["Unavailable", String(track_ref.current?.meta?.unavailable ?? unknown)],
        ["Track Range", `${duration_to_string(track_ref.current?.meta?.begdur ?? 0)} - ${duration_to_string(track_ref.current?.meta?.enddur ?? (track_ref.current?.duration ?? 0))}`],
        ["Songs", JSON.stringify(track_ref.current?.meta?.songs ?? [])],
        ["Chapters", JSON.stringify(track_ref.current?.meta?.chapters ?? [])],
        ["Plays", String(track_ref.current?.meta?.plays)],
    ]

    return(
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <ModalHeader title={"Track Info"}/>
            <ScrollView>
                <View style={{width: '100%', alignItems: 'center', maxHeight: 450, minHeight: 350, overflow: 'hidden'}}>
                    <View style={{flexGrow: 1, height: 50}}/>
                    <ScaledImage set_size={set_tint_size} artwork={track_ref.current?.playback?.artwork ?? 0} width={Dimensions.get('screen').width * .8} style={{ maxHeight: Dimensions.get('screen').height / 2, maxWidth: Dimensions.get('screen').width - 20, height: undefined, width: Dimensions.get('screen').width - 20, borderRadius: 10}}/>
                    {is_empty(tint) ? null : <View style={{top: 50, borderRadius: 10, width: tint_size.width, height: tint_size.height, opacity: 0.15, position: 'absolute', backgroundColor: tint}}/>}
                </View>
                <Text numberOfLines={1} style={{marginHorizontal: 40, top: 8, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{track_ref.current?.title || ""}</Text>
                <Text style={{...styles.text_base, marginHorizontal: 40, top: 6}}>{artist_string(track_ref.current!)}</Text>
                <Text style={{...styles.text_base, marginHorizontal: 40, top: 6}}>{track_ref.current?.album?.name}</Text>
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
        </View>
    );
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    text_base: {
        color: colors.text, 
        fontSize: 14
    }
});