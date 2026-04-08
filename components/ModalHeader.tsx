import usePTheme from "@hooks/usePTheme";
import { router } from "expo-router";
import { Button, Text, View, type ColorValue, Platform } from "react-native";
import type { IconTouchableOpacityProps } from "./TouchableIconOpacity";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import type { Ionicons } from "@expo/vector-icons";

export default function ModalHeader(props: { title: string; background_color?: ColorValue; text_color?: ColorValue; close_color?: ColorValue; right_icon?: IconTouchableOpacityProps<typeof Ionicons> }) {
	const { colors } = usePTheme();

	function close() {
		if (!router.canDismiss()) return;
		router.dismiss();
	}

	// On mobile, modals are sheets with rounded top corners; on desktop they're full windows
	const headerBorderRadius = Platform.OS === 'ios' || Platform.OS === 'android'
		? { borderTopLeftRadius: 10, borderTopRightRadius: 10 }
		: {};

	return (
		<View style={{ width: "100%", height: 55, backgroundColor: props.background_color ?? colors.shelf, justifyContent: "center", alignItems: "center", ...headerBorderRadius, flexDirection: "row" }}>
			<View style={{ marginLeft: 10, position: "absolute", left: 0 }}>
				<Button color={props.close_color ?? colors.primary} title="Close" onPress={close} />
			</View>
			<Text style={{ color: props.text_color ?? colors.text, fontWeight: "bold", fontSize: 17 }}>{props.title}</Text>
			{props.right_icon ? <IoniconsTouchableOpacity {...props.right_icon} style={[props.right_icon.style, { position: "absolute", right: 20 }]} /> : null}
		</View>
		// <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
		//     <Button color={colors.primary} title={'Close'} onPress={close}/>
		//     <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '40%'}}>{props.title}</Text>
		// </View>
	);
}
