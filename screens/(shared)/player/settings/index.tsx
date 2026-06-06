import { reinterpret_cast } from "@common/cast";
import Equalizer from "@components/Equalizer";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import ModalHeader from "@components/ModalHeader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { Prefs } from "@illusive/prefs";
import { Slider } from "@miblanchard/react-native-slider";
import { SharedRouter } from "@utils/shared_routes";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import TrackPlayer from "react-native-track-player";
import { useIsFocused } from "@react-navigation/native";

const min_crossfade = 0;
const max_crossfade = 10;
const min_rate = 0.01;
const max_rate = 2.0;
const rate_presets: Record<string, number> = { Default: 1.0, "0.5x": 0.5, "0.75x": 0.75, "1.0x": 1.0, "1.25x": 1.25, "1.5x": 1.5, "1.75x": 1.75, "2.0x": 2.0 };
const sleep_timer_presets: Record<string, number> = { Off: 0, "5m": 5, "15m": 15, "30m": 30, "45m": 45, "1h": 60 };

function sleep_timer_label(minutes: number): string {
	if (minutes <= 0) return "Off";
	return minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
}

export default function AudioPlayerSettings() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const is_focused = useIsFocused();

	const [rate, set_rate] = useState<number>(1.0);
	const [crossfade_seconds, set_crossfade_seconds] = useState<number>(Prefs.get_pref("crossfade"));
	const [equalizer_preset, set_equalizer_preset] = useState<Prefs.EqualizerPreset>(Prefs.get_pref("equalizer_preset"));
	const [sleep_timer_minutes, set_sleep_timer_minutes] = useState<number>(0);

	useEffect(() => {
		set_equalizer_preset(Prefs.get_pref("equalizer_preset"));
		TrackPlayer.getRate().then((new_rate) => set_rate(new_rate));
	}, [is_focused]);

	async function update_rate(new_rate: number) {
		await TrackPlayer.setRate(new_rate);
		set_rate(new_rate);
	}
	async function update_crossfade_seconds(new_crossfade_seconds: number) {
		await TrackPlayer.setCrossFade(new_crossfade_seconds);
		set_crossfade_seconds(new_crossfade_seconds);
		Prefs.save_pref("crossfade", new_crossfade_seconds);
	}
	function update_sleep_timer(minutes: number) {
		// TODO: wire up actual sleep timer scheduling (stop playback after duration)
		set_sleep_timer_minutes(minutes);
	}

	const RateChipRenderer = (props: { entry: [keyof typeof rate_presets, (typeof rate_presets)[keyof typeof rate_presets]] }) => (
		<TouchableOpacity style={[styles.rate_chip, rate === props.entry[1] && styles.chip_active]} onPress={async () => update_rate(rate_presets[props.entry[0]])}>
			<Text style={styles.rate_chip_text}>{props.entry[0]}</Text>
		</TouchableOpacity>
	);

	return (
		<>
			<ModalHeader title={"Settings"} />
			<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
				<View style={styles.card}>
					<View style={styles.card_header}>
						<MaterialCommunityIcons name="play-speed" size={18} color={colors.primary} />
						<Text style={styles.card_label}>Playback Speed</Text>
						<Text style={styles.card_value}>{String(rate).slice(0, 4)}x</Text>
					</View>
					<View style={styles.card_slider}>
						<Slider
							value={rate}
							onValueChange={async (value) => update_rate(value[0])}
							thumbTintColor={colors.primary}
							thumbStyle={{ width: 15, height: 15 }}
							thumbTouchSize={{ width: 1, height: 1 }}
							minimumTrackTintColor={colors.primary}
							maximumTrackTintColor="#DADADA40"
							step={0.05}
							debugTouchArea={false}
							minimumValue={min_rate}
							maximumValue={max_rate}
						/>
					</View>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips_scroll}>
						{Object.entries(rate_presets).map((preset_entry) => (
							<RateChipRenderer key={preset_entry[0]} entry={preset_entry} />
						))}
					</ScrollView>
				</View>

				<View style={styles.card}>
					<View style={styles.card_header}>
						<MaterialCommunityIcons name="shuffle-variant" size={18} color={colors.primary} />
						<Text style={styles.card_label}>Crossfade</Text>
						<Text style={styles.card_value}>{String(crossfade_seconds).slice(0, 4)}s</Text>
					</View>
					<View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12 }}>
						<View style={{ flex: 1, marginRight: 12 }}>
							<Slider
								value={crossfade_seconds}
								onValueChange={async (value) => update_crossfade_seconds(value[0])}
								thumbTintColor={colors.primary}
								thumbStyle={{ width: 15, height: 15 }}
								thumbTouchSize={{ width: 1, height: 1 }}
								minimumTrackTintColor={colors.primary}
								maximumTrackTintColor="#DADADA40"
								step={0.1}
								debugTouchArea={false}
								minimumValue={min_crossfade}
								maximumValue={max_crossfade}
							/>
						</View>
						<TouchableOpacity style={styles.rate_chip} onPress={async () => update_crossfade_seconds(0.0)}>
							<Text style={styles.rate_chip_text}>Reset</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.card}>
					<View style={styles.card_header}>
						<MaterialCommunityIcons name="moon-waning-crescent" size={18} color={colors.primary} />
						<Text style={styles.card_label}>Sleep Timer</Text>
						<Text style={styles.card_value}>{sleep_timer_label(sleep_timer_minutes)}</Text>
					</View>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips_scroll}>
						{Object.entries(sleep_timer_presets).map(([label, minutes]) => (
							<TouchableOpacity key={label} style={[styles.rate_chip, sleep_timer_minutes === minutes && styles.chip_active]} onPress={() => update_sleep_timer(minutes)}>
								<Text style={styles.rate_chip_text}>{label}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				<View style={styles.card}>
					<View style={styles.card_header}>
						<MaterialCommunityIcons name="equalizer" size={18} color={colors.primary} />
						<Text style={styles.card_label}>Equalizer</Text>
						<Text style={styles.card_value}>{equalizer_preset}</Text>
					</View>
					<Equalizer values={reinterpret_cast<number[]>(Prefs.equalizer_presets[equalizer_preset] ?? Prefs.equalizer_presets.Default)} />
					<View style={{ height: 6 }} />
					<ExtrasSectionButton transparent text="Equalizer Presets" icon="ear-outline" show_arrow onPress={() => SharedRouter.goto_shared_player_equalizer_selector()} />
				</View>
			</ScrollView>
		</>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		card: { backgroundColor: colors.card, borderRadius: 2, marginHorizontal: 12, marginBottom: 12, paddingTop: 14, paddingBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
		card_header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 6, gap: 8 },
		card_label: { color: colors.text, fontWeight: "500", fontSize: 15, flex: 1 },
		card_value: { color: colors.subtext, fontWeight: "700", fontSize: 15 },
		card_slider: { marginHorizontal: 18, marginTop: 4 },
		rate_chip: { borderRadius: 16, height: 36, paddingHorizontal: 14, marginHorizontal: 4, justifyContent: "center", alignItems: "center", backgroundColor: colors.shelf, borderColor: colors.line, borderWidth: 1 },
		chip_active: { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
		chips_scroll: { paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
		rate_chip_text: { color: colors.text, fontSize: 13, fontWeight: "500" }
	});
