import { Text, View } from "react-native";
import usePTheme from "@hooks/usePTheme";

export default function HeaderWith(props: {children?: any, title: string}){
    const { colors } = usePTheme();

    return (
        <>
            <Text style={{color: colors.text, left: 2, fontSize: 25, fontWeight: 'bold'}}>{props.title}</Text>
            <View style={{paddingVertical: 5}}/>
            {props.children}
        </>
    )
}