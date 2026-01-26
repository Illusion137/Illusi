import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";

export default function ShufflePlayButton(props: {
    on_press: () => void;
    top?: number;
    text?: string;
}){
    const { colors } = usePTheme();

    const text_color = colors.black;
    return (
        <TouchableOpacity onPress={props.on_press} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', top: props.top}}>
            <Ionicons name="shuffle" size={25} color={text_color} style={{}}/>
            <Text style={{fontWeight: '500', fontSize: 18, color: text_color}}>{props.text ?? "Shuffle Play"}</Text>
        </TouchableOpacity>
    );
}