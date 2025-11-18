import { Ionicons, MaterialCommunityIcons, FontAwesome, AntDesign, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import type { Icon } from "@expo/vector-icons/build/createIconSet";
import type { Insets, StyleProp, TextStyle, ViewStyle } from "react-native";
import { TouchableOpacity } from "react-native";

interface IconTouchableOpacityProps<T extends Icon<any, any>> {
    style?: StyleProp<ViewStyle>;
    icon_name: keyof (T)["glyphMap"];
    icon_size: number;
    icon_color: string;
    icon_style?: StyleProp<TextStyle>;
    on_press: () => any;
    on_long_press?: () => any;
    hitslop?: number|Insets;
    disabled?: boolean;
}

export function IoniconsTouchableOpacity(props: IconTouchableOpacityProps<typeof Ionicons>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <Ionicons name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function MaterialCommunityIconsTouchableOpacity(props: IconTouchableOpacityProps<typeof MaterialCommunityIcons>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <MaterialCommunityIcons name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function FontAwesomeTouchableOpacity(props: IconTouchableOpacityProps<typeof FontAwesome>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <FontAwesome name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function FontAwesome5TouchableOpacity(props: IconTouchableOpacityProps<typeof FontAwesome5>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <FontAwesome5 name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function FontAwesome6TouchableOpacity(props: IconTouchableOpacityProps<typeof FontAwesome6>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <FontAwesome6 name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function AntDesignTouchableOpacity(props: IconTouchableOpacityProps<typeof AntDesign>){
    return (
        <TouchableOpacity disabled={props.disabled} style={props.style} onPress={props.on_press} onLongPress={props.on_long_press} hitSlop={props.hitslop}>
            <AntDesign name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}