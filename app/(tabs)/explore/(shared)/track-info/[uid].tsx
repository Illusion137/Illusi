import { milliseconds_of } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Dimensions, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import TrackIconTags from "@components/TrackIconTags";
import TextTicker from "react-native-text-ticker";
import HeaderWith from "@components/HeaderWith";
import IImage from "@components/IImage";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";

export default function EditTrackModal(){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);
    
    const { uid } = useLocalSearchParams<{uid: string}>();
    const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));
    
    const { track_colors } = useTrackColors(track_ref.current);
    const tint = GLOBALS.global_var.tint_table.get(track_ref.current?.uid ?? "");
    const unknown = "Unknown";
    
    function date_string(isostring?: string){
        const date = new Date(isostring ?? 0);
        if(date.getTime() <= milliseconds_of({years: 30})) return unknown;
        return date.toDateString();
    }

    const is_trimmed = track_ref.current?.meta?.begdur && track_ref.current?.meta?.begdur !== 0 
        && track_ref.current?.meta?.enddur && track_ref.current?.meta?.enddur != (track_ref.current.duration ?? 0);
    const base_data: [string, any][] = [
        ["Added Date", date_string(track_ref.current?.meta?.added_date)],
        ["Downloaded Date", date_string(track_ref.current?.meta?.downloaded_date)],
        ["Last Played Date", date_string(track_ref.current?.meta?.last_played_date)],
        ["Last Sampled Date", date_string(track_ref.current?.meta?.last_sampled_date)],
        ["Age Restricted", String(track_ref.current?.meta?.age_restricted ?? unknown)],
        ["Unavailable", String(track_ref.current?.meta?.unavailable ?? unknown)],
        ["Track Range", `${duration_to_string(track_ref.current?.meta?.begdur ?? 0)} - ${duration_to_string(track_ref.current?.meta?.enddur ?? (track_ref.current?.duration ?? 0))}${is_trimmed ? ` (TRIM)[0:00-${duration_to_string(track_ref.current?.duration ?? 0)}]` : ""}`],
        ["Plays", String(track_ref.current?.meta?.plays)],
    ]

    return(
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <ModalHeader title={"Track Info"} background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background}/>
            <ScrollView scrollToOverflowEnabled={false}>
                {track_colors ? <LinearGradient
                        colors={[track_colors.primary, track_colors.background, 'transparent']}
                        style={{
                            position: 'absolute',
                            top: 0,
                            height: Dimensions.get('screen').height * .8,
                            width: '100%',
                        }}/> : null}
                <View style={{width: '100%', alignItems: 'center', maxHeight: 450, minHeight: 350, overflow: 'hidden', marginTop: 30}}>
                    <ScaledImage tint={tint ? {color: tint, opacity: 0.15} : undefined} artwork={track_ref.current?.playback?.artwork} width={Dimensions.get('screen').width * .85} style={{borderRadius: 10}}/>
                </View>
                <View style={{marginHorizontal: 40, marginTop: 8}}>
                    <TextTicker style={{color: colors.text, fontWeight: 'bold', fontSize: 24}} scroll={false} duration={18000} bounce={false} easing={Easing.linear}>{track_ref.current?.title ?? ""}</TextTicker>
                    <Text style={{...styles.text_base, fontSize: 16}}>{artist_string(track_ref.current!)}</Text>
                    { track_ref.current?.album?.name ? <Text style={{...styles.text_base}}>{track_ref.current?.album?.name}</Text> : null }
                    <View style={{flexDirection: 'row'}}>
                        <TrackIconTags track_data={track_ref.current ?? ExampleObj.track_example0} is_downloading={false} size={22}/>
                    </View>
                </View>
                <View style={{height: 10}}/>
                {
                    base_data.map((item, i) => (
                        <View key={i + item[0]} style={{flexDirection: 'row', width: '100%', marginHorizontal: 40}}>
                            <Text style={{...styles.text_base, fontWeight: 'bold', width: '35%'}}>{item[0]}</Text>
                            <Text style={{...styles.text_base}}>{item[1]}</Text>
                        </View>
                    ))
                }
                {(track_ref.current?.meta?.songs?.length ?? 0) > 0 ? 
                    <View style={{width: '100%', marginHorizontal: 20}}>
                        <HeaderWith title="Songs">
                            <ScrollView horizontal style={{flex: 1, top: 10}} contentContainerStyle={{flexDirection: 'row', marginHorizontal: 15}}>
                            {track_ref.current?.meta?.songs?.map((song, i) => (
                                <View key={i + song.title} style={{width: 120, marginHorizontal: 5}}>
                                    <IImage source={song.artwork_url} width={120} height={120} style={{borderRadius: 5}}/>
                                    <Text numberOfLines={1} style={{...styles.text_base, fontWeight: 'bold'}}>{song.title}</Text>
                                    <Text numberOfLines={1} style={{...styles.text_base}}>{song.artist}</Text>
                                    <Text numberOfLines={1} style={{...styles.text_base}}>{song.album}</Text>
                                </View>
                            ))}
                            </ScrollView>
                        </HeaderWith>
                    </View>
                    : null}
                <View style={{height: 100}}/>
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