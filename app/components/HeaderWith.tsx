import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";

export default function HeaderWith(props: {children?: any, title: string}){
    const { colors } = useTheme() as Prefs.Theme;

    return (
        <>
            <Text style={{color: colors.text, left: 2, fontSize: 25, fontWeight: 'bold'}}>{props.title}</Text>
            <View style={{paddingVertical: 5}}/>
            {props.children}
        </>
    )
}