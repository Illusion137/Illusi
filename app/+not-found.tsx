import { useEffect } from "react";
import { useNavigation } from "expo-router";
import { CommonActions } from "expo-router/react-navigation";
import { View } from "react-native";

export default function NotFound() {
	const navigation = useNavigation();

	useEffect(() => {
		navigation.dispatch(
			CommonActions.reset({
				index: 0,
				routes: [{ name: "(tabs)" }]
			})
		);
	}, []);

	return <View />;
}
