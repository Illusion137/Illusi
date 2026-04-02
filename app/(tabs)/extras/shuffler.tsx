import Equalizer from "@components/Equalizer";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { Entypo } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { FutsalShuffle } from "@illusive/futsal_shuffle";
import { GLOBALS } from "@illusive/globals";
import { Prefs } from "@illusive/prefs";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, ScrollView, Text, TextInput, View } from "react-native";

const shuffler_min = -1;
const shuffler_max = 1;
function ShufflerInput(props: { shuffler_key: string; initial_value: number; on_update: () => any }) {
	const { colors } = usePTheme();

	function on_change_text(text: string) {
		const value = parseFloat(text);
		if (isNaN(value)) return;
		Prefs.prefs.track_shuffle_bias.current_value[props.shuffler_key as keyof typeof Prefs.prefs.track_shuffle_bias.current_value] = value;
		Prefs.save_pref("track_shuffle_bias", Prefs.prefs.track_shuffle_bias.current_value);
		props.on_update();
	}

	return (
		<>
			<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", height: 45, backgroundColor: colors.track, paddingHorizontal: 15 }}>
				<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
					<Entypo name="shuffle" color={colors.primary} size={25} style={{ marginRight: 12 }} />
					<Text style={{ color: colors.text, fontSize: 18 }}>{Prefs.snake_case_to_plain_text(props.shuffler_key)}</Text>
				</View>
				<TextInput
					defaultValue={String(props.initial_value)}
					keyboardType="numbers-and-punctuation"
					textAlign="right"
					style={{ backgroundColor: colors.track, width: "40%", height: "70%", padding: 5, color: colors.text, fontSize: 18, fontStyle: "italic", fontWeight: "500" }}
					onChangeText={on_change_text}
				/>
			</View>
			<View style={{ height: 1, backgroundColor: colors.line, width: "90%", left: "10%" }} />
			<View style={{ height: 1, backgroundColor: colors.line, width: "30%", left: "70%" }} />
		</>
	);
}

export default function Shuffler() {
	const shuffler_inputs = Object.keys(Prefs.default_track_shuffle_bias).map((key) => [key, Prefs.get_pref("track_shuffle_bias")[key] ?? 0]);
	const [visualizer_state, set_visualizer_state] = useState(get_visualizer_values());

	function get_visualizer_values() {
		return FutsalShuffle.get_bias_visualizer_data(GLOBALS.global_var.sql_tracks);
	}

	function update_visualizer_state() {
		set_visualizer_state(get_visualizer_values());
	}

	return (
		<View>
			<Equalizer min={shuffler_min} max={shuffler_max} values={visualizer_state} freqs={[]} height={180} />
			<ExtrasSectionButton icon="easel-sharp" text="Show Example Shuffle" show_arrow={true} onPress={() => router.push({ pathname: "/extras/shuffler-test", params: { mode: "SHUFFLE" } })} />
			<ExtrasSectionButton icon="easel-sharp" text="Show Weights (ASC)" show_arrow={true} onPress={() => router.push({ pathname: "/extras/shuffler-test", params: { mode: "ASC" } })} />
			<ExtrasSectionButton icon="easel-sharp" text="Show Weights (DESC)" show_arrow={true} onPress={() => router.push({ pathname: "/extras/shuffler-test", params: { mode: "DESC" } })} />
			<View style={{ height: 10 }} />
			<ScrollView>
				{shuffler_inputs.map((input) => (
					<ShufflerInput key={input[0]} shuffler_key={input[0]} initial_value={input[1]} on_update={update_visualizer_state} />
				))}
				<View style={{ height: Dimensions.get("screen").height * 0.7 }} />
			</ScrollView>
		</View>
	);
}
