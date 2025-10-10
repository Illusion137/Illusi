import { Text, View } from "react-native";

export default function NotFound() {
	return (
		<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
			<Text style={{fontWeight: 'bold'}}>This page doesn't exist</Text>
		</View>
	);
}
