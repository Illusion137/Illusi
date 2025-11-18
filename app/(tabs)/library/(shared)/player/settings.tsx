import { reinterpret_cast } from "@common/cast";
import Equalizer from "@components/Equalizer";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import ModalHeader from "@components/ModalHeader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { Prefs } from "@illusive/prefs";
import { Slider } from "@miblanchard/react-native-slider";
import { SharedRouter } from "@utils/shared_routes";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import TrackPlayer from "react-native-track-player";
import { useIsFocused } from '@react-navigation/native';

const min_crossfade = 0;
const max_crossfade = 10;
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

    const is_focused = useIsFocused();

    const [rate, set_rate] = useState<number>(1.0);
    const [crossfade_seconds, set_crossfade_seconds] = useState<number>(Prefs.get_pref('crossfade'));
    const [equalizer_preset, set_equalizer_preset] = useState<Prefs.EqualizerPreset>(Prefs.get_pref('equalizer_preset'));

    useEffect(() => {
        set_equalizer_preset(Prefs.get_pref('equalizer_preset'));
    }, [is_focused]);

    async function update_rate(new_rate: number){
        await TrackPlayer.setRate(new_rate);
        set_rate(new_rate);
    }
    async function update_crossfade_seconds(new_crossfade_seconds: number){
        // await TrackPlayer.(new_crossfade_seconds);
        set_crossfade_seconds(new_crossfade_seconds);
        Prefs.save_pref('crossfade', new_crossfade_seconds);
    }

    const RateChipRenderer = (props: {entry: [keyof typeof rate_presets, typeof rate_presets[keyof typeof rate_presets]]}) => 
        (<TouchableOpacity style={styles.rate_chip} onPress={async () => update_rate(rate_presets[props.entry[0]])}><Text style={styles.rate_chip_text}>{props.entry[0]}</Text></TouchableOpacity>);

    return (
        <>
            <ModalHeader title={"Settings"}/>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Text style={{ left: 17, top: 18, color: "white", fontWeight: "300", fontSize: 15 }}>Playback Speed:</Text>
                <Text style={{ left: "34%", bottom: 0, color: "white", fontWeight: "bold", fontSize: 17 }}>{String(rate).slice(0, 4)}x</Text>
                <MaterialCommunityIcons name="play-speed" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                <View style={styles.slider}>
                    <Slider
                        value={rate}
                        onValueChange={async (value) => update_rate(value[0])}
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
                <View style={{flexDirection: 'row', height: 35, alignItems: 'center'}}>
                    <Text style={{ left: 17, color: "white", fontWeight: "300", fontSize: 15 }}>Crossfade (seconds):</Text>
                    <Text style={{ left: 28, color: "white", fontWeight: "bold", fontSize: 17 }}>{String(crossfade_seconds).slice(0, 4)}s</Text>
                </View>
                <View style={{width: '100%', flexDirection: 'row'}}>
                    <View style={styles.slider_small}>
                        <Slider
                            value={crossfade_seconds}
                            onValueChange={async (value) => update_crossfade_seconds(value[0])}
                            thumbTintColor={colors.primary}
                            thumbStyle={{ width: 15, height: 15 }}
                            thumbTouchSize={{ width: 1, height: 1 }}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor='#DADADA40'
                            step={0.1}
                            debugTouchArea={false}
                            minimumValue={min_crossfade}
                            maximumValue={max_crossfade}
                        />
                    </View>
                    <TouchableOpacity style={styles.rate_chip} onPress={async () => update_crossfade_seconds(0.0)}>
                        <Text style={styles.rate_chip_text}>Reset</Text>
                    </TouchableOpacity>
                </View>
                <Equalizer values={reinterpret_cast<number[]>(Prefs.equalizer_presets[equalizer_preset] ?? Prefs.equalizer_presets.Default)}/>
                <View style={{height: 10}}/>
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
        borderRadius: 16,
        height: 40,
        padding: 10,
        marginHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderColor: colors.line,
        borderWidth: 1
    },
    rate_chip_text: {
        color: colors.text
    }
});