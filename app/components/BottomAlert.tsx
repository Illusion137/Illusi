import { Ionicons } from "@expo/vector-icons";
import { Animated, Text } from "react-native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { is_empty } from "../../lib-origin/origin/src/utils/util";
import { BottomAlertType } from "../../lib-origin/Illusive/src/types";
import * as Haptics from 'expo-haptics';

export default function BottomAlert(props: {
    type: BottomAlertType
    text: string
    uuid: string
}){
    const { colors } = useTheme() as Prefs.Theme;
    // const styles = theme_styles(colors);

    const position_animated = useRef(new Animated.Value(120)).current;

    useEffect(() => {
        if(is_empty(props.uuid)) return;
        Haptics.notificationAsync(type_map[props.type].haptic);
        Animated.timing(position_animated, {
            'useNativeDriver': false,
            'toValue': 85,
            'duration': 1000
        }).start();
        setTimeout(() => {
            Animated.timing(position_animated, {
                'useNativeDriver': false,
                'toValue': 120,
                'duration': 1000
            }).start();
        }, 1000 + props.text.split(' ').length * 300);
    }, [props.uuid]);

    const type_map = {
        "GOOD": {
            icon: "checkmark-circle-sharp",
            color: "#00FF00",
            haptic: Haptics.NotificationFeedbackType.Success,
        },
        "INFO": {
            icon: "information-circle-sharp",
            color: "#00FFFF",
            haptic: Haptics.NotificationFeedbackType.Warning
        },
        "WARN": {
            icon: "warning-sharp",
            color: "#FFFF00",
            haptic: Haptics.NotificationFeedbackType.Error
        }
    } as const;

    return (
    <Animated.View style={{
        pointerEvents: 'none',
        position: 'absolute', 
        alignItems: 'center', 
        zIndex: 50, 
        left: "5%", 
        top: position_animated.interpolate({
            'inputRange': [80, 120],
            'outputRange': ["80%", "120%"],
        }), 
        backgroundColor: colors.shelf, 
        flexDirection: 'row', 
        width: '90%', 
        height: '7%', 
        borderRadius: 20}}>
        <Ionicons name={type_map[props.type].icon as any} size={40} color={type_map[props.type].color} style={{paddingLeft: 10}}/>
        <Text style={{color: "white", paddingLeft: 10, fontSize: 12, fontWeight: 'bold'}}>{props.text}</Text>
    </Animated.View>);
}