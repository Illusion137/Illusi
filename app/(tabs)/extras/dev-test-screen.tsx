import { View } from "react-native";
import Equalizer from "@components/Equalizer";
import usePTheme from "@hooks/usePTheme";
import { useState } from "react";

export default function ExtraDevTestScreen(){
    const { colors } = usePTheme();
    colors;

    const [bands, setBands] = useState([-6, -2, 0, 2, 5]);

    return (
        <View>
            <Equalizer values={bands} />
        </View>
    );
}