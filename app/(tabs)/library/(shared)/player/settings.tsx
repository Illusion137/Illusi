import Equalizer from "@components/Equalizer";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import type { Prefs } from "@illusive/prefs";
import { Slider } from "@miblanchard/react-native-slider";
import { SharedRouter } from "@utils/shared_routes";
import { router } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import TrackPlayer from "react-native-track-player";

const min_rate = 0.01;
const max_rate = 2.0;
const rate_presets: Record<string, number> = {
    "Default": 1.0,
    "0.5x": 0.5,
    "0.75x": 0.75,
    "1.0x": 1.0,
    "1.25x": 1.25,
    "1.5x": 1.5,
    "1.75x": 1.75,
    "2.0x": 2.0,
};

export default function AudioPlayerSettings(){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const [rate, set_rate] = useState<number>(1.0);
    const [crossfade_seconds, set_crossfade_seconds] = useState<number>(0.0);
    //equalizer_presets[Prefs.get_pref('equalizer_preset')]
    const [equalizer_bands, set_equalizer_bands] = useState<number[]>([8, 8, 1, 2, 5, 6, 7, 8, 7]);

    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    async function update_rate(new_rate: number){
        await TrackPlayer.setRate(new_rate);
        set_rate(new_rate);
    }
    async function update_crossfade_seconds(new_crossfade_seconds: number){
        await TrackPlayer.setCrossfade(new_crossfade_seconds);
        set_crossfade_seconds(new_crossfade_seconds);
    }

    const RateChipRenderer = (props: {entry: [keyof typeof rate_presets, typeof rate_presets[keyof typeof rate_presets]]}) => 
        (<TouchableOpacity style={styles.rate_chip} onPress={() => update_rate(rate_presets[props.entry[0]])}><Text style={styles.rate_chip_text}>{props.entry[0]}</Text></TouchableOpacity>);

    return (
        <>
            <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                <View style={{ marginLeft: 10 }}>
                    <Button color={colors.primary} title='close' onPress={close} />
                </View>
                <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Settings</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Text style={{ left: 17, top: 18, color: "white", fontWeight: "300", fontSize: 15 }}>Playback Speed:</Text>
                <Text style={{ left: "34%", bottom: 0, color: "white", fontWeight: "bold", fontSize: 17 }}>{String(rate).slice(0, 4)}x</Text>
                <MaterialCommunityIcons name="play-speed" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                <View style={styles.slider}>
                    <Slider
                        value={rate}
                        onValueChange={(value) => update_rate(value[0])}
                        thumbTintColor={colors.primary}
                        thumbStyle={{ width: 15, height: 15 }}
                        thumbTouchSize={{ width: 1, height: 1 }}
                        minimumTrackTintColor={colors.primary}
                        maximumTrackTintColor='#DADADA40'
                        step={0.05}
                        debugTouchArea={false}
                        minimumValue={min_rate}
                        maximumValue={max_rate}
                    />
                </View>
                <View style={{height: 50}}>
                    <ScrollView horizontal={true}>
                        { Object.entries(rate_presets).map(preset_entry => (<RateChipRenderer key={preset_entry[0]} entry={preset_entry}/>)) }
                    </ScrollView>
                </View>
                <View style={{width: '100%', flexDirection: 'row'}}>
                    <View style={styles.slider_small}>
                        <Slider
                            value={rate}
                            onValueChange={(value) => update_rate(value[0])}
                            thumbTintColor={colors.primary}
                            thumbStyle={{ width: 15, height: 15 }}
                            thumbTouchSize={{ width: 1, height: 1 }}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor='#DADADA40'
                            step={0.05}
                            debugTouchArea={false}
                            minimumValue={min_rate}
                            maximumValue={max_rate}
                        />
                    </View>
                    <TouchableOpacity style={styles.rate_chip} onPress={() => update_crossfade_seconds(0.0)}>
                        <Text style={styles.rate_chip_text}>Reset</Text>
                    </TouchableOpacity>
                </View>
                <Equalizer values={equalizer_bands}/>
                <View style={{height: 20}}/>
                <ExtrasSectionButton text="Equalizer Presets" icon="ear-outline" show_arrow onPress={() => SharedRouter.goto_shared_player_equalizer_selector()}/>
            </View>
        </>
    );
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    slider: {
        marginLeft: 40,
        marginRight: 80,
    },
    slider_small: {
        width: '70%',
        marginLeft: 40,
        marginRight: 20,
    },
    rate_chip: {
        borderRadius: 20,
        height: 40,
        padding: 10,
        marginHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.secondary
    },
    rate_chip_text: {
        color: colors.text
    }
});