import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import type { BottomAlertType } from "@illusive/types";
import * as Haptics from "expo-haptics";
import usePTheme from "@hooks/usePTheme";
import type { ResponseError } from "@common/types";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
  } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { is_empty } from "@common/utils/util";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import { alert_info } from "@illusive/illusi/src/alert";

const alert_show_height = 85;
const alert_hide_height = 120;
export default function BottomAlert(props: { type: BottomAlertType; text: string; more_info?: string|ResponseError; uuid: string }) {
	const { colors } = usePTheme();

	const position_animated = useSharedValue(alert_hide_height);
	// const position_animated = useRef(new Animated.Value(85)).current;
	// const position_animated = useRef(new Animated.Value(120)).current;

	useEffect(() => {
		if (is_empty(props.uuid)) return;
		Haptics.notificationAsync(type_map[props.type].haptic);
		position_animated.value = withSpring(alert_show_height, {
			duration: 100
		});
	}, [props.uuid]);

	const type_map: Record<BottomAlertType, {
		icon: keyof (typeof Ionicons)["glyphMap"],
		color: string,
		haptic: Haptics.NotificationFeedbackType
	}> = {
		GOOD: {
			icon: "checkmark-circle-sharp",
			color: "#00FF00",
			haptic: Haptics.NotificationFeedbackType.Success
		},
		INFO: {
			icon: "information-circle-sharp",
			color: "#00FFFF",
			haptic: Haptics.NotificationFeedbackType.Warning
		},
		WARN: {
			icon: "warning-sharp",
			color: "#FFFF00",
			haptic: Haptics.NotificationFeedbackType.Error
		},
		ERROR: {
			icon: "alert-circle-sharp",
			color: "#FF0000",
			haptic: Haptics.NotificationFeedbackType.Error
		}
	} as const;

	function hide(){
		position_animated.value = withSpring(alert_hide_height, {
			duration: 100
		});
	}
	function show_more_info(){
		if(props.more_info === undefined) return;
		if(typeof props.more_info === "string"){
			alert_info(props.more_info);
		}
		else alert_info(props.more_info.error.stack ?? props.more_info.error.message);
		hide();
	}

	const pan_gesture = Gesture.Pan()
		.onUpdate((event) => {
			if (event.translationY > 0) {
				position_animated.value = (event.translationY * 0.2) + alert_show_height;
			}
		})
		.onEnd((event) => {
			if (event.translationY > 50 || event.velocityY > 800) {
				position_animated.value = withTiming(alert_hide_height, {}, () => {return;});
			} else {
				position_animated.value = withSpring(alert_show_height);
			}
		});
	const animated_style = useAnimatedStyle(() => ({
		top: `${position_animated.value}%`,
	}));

	return (
		<GestureDetector gesture={pan_gesture}>
		<Animated.View
			style={[{
				position: "absolute",
				alignItems: "center",
				zIndex: 50,
				left: "5%",
				// top: position_animated.interpolate({
				// 	inputRange: [80, 120],
				// 	outputRange: ["80%", "120%"]
				// }),
				backgroundColor: colors.shelf,
				borderWidth: 1,
				borderColor: type_map[props.type].color,
				flexDirection: "row",
				width: "90%",
				height: "7%",
				borderRadius: 10
			}, animated_style]}>
			<Ionicons name={type_map[props.type].icon as any} size={30} color={type_map[props.type].color} style={{ paddingLeft: 10 }} />
			<IoniconsTouchableOpacity on_press={hide} icon_name="close-sharp" icon_size={20} icon_color={colors.text} hitslop={5} style={{ position: 'absolute', zIndex: 10, top: 10, right: 10 }} />
			<TouchableOpacity onPress={show_more_info} style={{paddingLeft: 10}}>
				<Text style={{ color: colors.text, fontSize: props.more_info ? 13 : 15, fontWeight: "bold", top: props.more_info ? 0 : 5 }}>{props.text}</Text>
				<Text numberOfLines={2} style={{ color: colors.subtext, fontSize: 10, width: '70%' }}>{props.more_info ? typeof props.more_info === "string" ? props.more_info : `[ERROR] ${props.more_info.error.message}` : ""}</Text>
			</TouchableOpacity>
		</Animated.View>
		</GestureDetector>
	);
}
