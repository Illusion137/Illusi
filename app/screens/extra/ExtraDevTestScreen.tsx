import { View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import Equalizer from "../../components/Equalizer";

export default function ExtraDevTestScreen(){
    const { colors } = useTheme() as Prefs.Theme;

    return (
        <View>
            <Equalizer bands_ranges={[32,64,125,250,500,1000,2000,3000,4000,5000]}/>
        </View>
    );
}