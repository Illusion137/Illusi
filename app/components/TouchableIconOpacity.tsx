import { Ionicons, MaterialCommunityIcons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { Icon } from "@expo/vector-icons/build/createIconSet";
import { Insets, StyleProp, TextStyle, TouchableOpacity, ViewStyle } from "react-native";

type IconTouchableOpacityProps<T extends Icon<any, any>> = {
    style?: StyleProp<ViewStyle>
    icon_name: keyof (T)["glyphMap"]
    icon_size: number
    icon_color: string
    icon_style: StyleProp<TextStyle>
    on_press: () => any
    hitslop?: number|Insets
}

export function IoniconsTouchableOpacity(props: IconTouchableOpacityProps<typeof Ionicons>){
    return (
        <TouchableOpacity style={props.style} onPress={props.on_press} hitSlop={props.hitslop}>
            <Ionicons name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function MaterialCommunityIconsTouchableOpacity(props: IconTouchableOpacityProps<typeof MaterialCommunityIcons>){
    return (
        <TouchableOpacity style={props.style} onPress={props.on_press} hitSlop={props.hitslop}>
            <MaterialCommunityIcons name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function FontAwesomeTouchableOpacity(props: IconTouchableOpacityProps<typeof FontAwesome>){
    return (
        <TouchableOpacity style={props.style} onPress={props.on_press} hitSlop={props.hitslop}>
            <FontAwesome name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}
export function AntDesignTouchableOpacity(props: IconTouchableOpacityProps<typeof AntDesign>){
    return (
        <TouchableOpacity style={props.style} onPress={props.on_press} hitSlop={props.hitslop}>
            <AntDesign name={props.icon_name} size={props.icon_size} color={props.icon_color} style={props.icon_style}/>
        </TouchableOpacity>
    )
}