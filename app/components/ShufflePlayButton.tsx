import { useTheme } from "@react-navigation/native";
import { Text, TouchableOpacity } from "react-native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Ionicons } from "@expo/vector-icons";

export default function ShufflePlayButton(props: {
    on_press: () => void
    top?: number
}){
    const { colors } = useTheme() as typeof Prefs.dark_theme;

    return (
        <TouchableOpacity onPress={props.on_press} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', top: props.top}}>
            <Ionicons name="shuffle" size={25} color={colors.background} style={{}}/>
            <Text style={{fontWeight: '500', fontSize: 18}}>Shuffle Play</Text>
        </TouchableOpacity>
    );
}