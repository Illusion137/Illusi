import { reinterpret_cast } from "@common/cast";
import Equalizer from "@components/Equalizer";
import ModalHeader from "@components/ModalHeader";
import { Prefs } from "@illusive/prefs";
import MultiOption from "@screens/other/MultiOption";
import { useState } from "react";
import { View } from "react-native";

const all_equalizer_presets = reinterpret_cast<Prefs.EqualizerPreset[]>(Object.keys(Prefs.equalizer_presets));
export default function EqualizerSelector() {
    const [current_equalizer_preset, set_current_equalizer_preset] = useState<Prefs.EqualizerPreset>(Prefs.get_pref('equalizer_preset'));

    function update_equalizer_preset(preset: Prefs.EqualizerPreset){
        if(!all_equalizer_presets.includes(preset)) return;
        set_current_equalizer_preset(preset);
        Prefs.save_pref('equalizer_preset', preset);
    }

    return (
        <>
            <ModalHeader title={"Equalizer Presets"}/>
            <Equalizer values={reinterpret_cast<number[]>(Prefs.equalizer_presets[current_equalizer_preset] ?? Prefs.equalizer_presets["Default"])}/>
            <View style={{height: 5}}/>
            <MultiOption
                current_value={current_equalizer_preset}
                options={all_equalizer_presets}
                on_press={(preset) => update_equalizer_preset(reinterpret_cast<Prefs.EqualizerPreset>(preset))}/>
        </>
    );
}