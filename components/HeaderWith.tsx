import { Text, View } from "react-native";
import usePTheme from "@hooks/usePTheme";
import { AntDesignTouchableOpacity } from "./TouchableIconOpacity";

export default function HeaderWith(props: {children?: any, title: string, fullpage?: () => any}){
    const { colors } = usePTheme();

    return (
        <>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 20}}>
                <Text style={{color: colors.text, left: 10, fontSize: 22, fontWeight: 'bold', paddingBottom: 2, paddingTop: 5}}>{props.title}</Text>
                {props.fullpage 
                    ? <AntDesignTouchableOpacity on_press={props.fullpage} style={{}} icon_name='right' icon_size={20} icon_color={colors.text} icon_style={{}}/> 
                    : null }
            </View>
            {props.children}
        </>
    )
}