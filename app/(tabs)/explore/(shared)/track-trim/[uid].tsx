import { GLOBALS } from "@illusive/globals";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, type DimensionValue } from "react-native";
import { PlayerState, Waveform, type IWaveformRef } from "@simform_solutions/react-native-audio-waveform";
import { artist_string } from "@illusive/illusive_utils";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { SQLfs } from "@illusive/sql/sql_fs";
import { round_decimal_place } from "@common/utils/util";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import ModalHeader from "@components/ModalHeader";
import IImage from "@components/IImage";
import TrackPlayer from "react-native-track-player";
import { trackplayer_has_been_setup } from "@illusive/track_player_service";

export const unstable_settings = {
	presentation: "modal",
	sheetAllowedDetents: [0.5],
	sheetGrabberVisible: true
};
export default function TrimTrackModal() {
	const { uid } = useLocalSearchParams<{ uid: string }>();
	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find((track) => track.uid === uid));

	const { colors } = usePTheme();

	const [left_trim, set_left_trim] = useState(0);
	const [right_trim, set_right_trim] = useState(1);
	const [scrubber, set_scrubber] = useState(0);

	const [playerstate, set_playerstate] = useState<PlayerState>(PlayerState.stopped);

	const waveform_ref = useRef<IWaveformRef>(null);

	useEffect(() => {
		try {
			if (trackplayer_has_been_setup) TrackPlayer.pause();
		} catch (e) {}
	}, []);

	useEffect(() => {
		set_left_trim(track_ref.current?.meta?.begdur ?? 0);
		set_right_trim(track_ref.current?.meta?.enddur ?? track_ref.current?.duration ?? 1);
	}, [track_ref.current]);

	function close() {
		if (!router.canDismiss()) return;
		waveform_ref.current?.pausePlayer();
		router.dismiss();
	}

	async function save_selection() {
		let update = false;
		if (!isNaN(left_trim)) {
			track_ref.current!.meta!.begdur = left_trim;
			update = true;
		}
		if (!isNaN(right_trim)) {
			track_ref.current!.meta!.enddur = right_trim;
			update = true;
		}
		if (update) {
			await SQLTracks.update_track_meta_data(track_ref.current!.uid, track_ref.current!.meta!);
		}
		close();
	}

	const selected_left_percent: DimensionValue = `${track_ref.current?.duration ? (left_trim * 100) / track_ref.current?.duration : 0}%`;
	const selected_right_percent: DimensionValue = `${track_ref.current?.duration ? (right_trim * 100) / track_ref.current?.duration : 0}%`;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title={"Trim Track"} />
			<View style={{ flexDirection: "row", marginHorizontal: 10, marginTop: 10 }}>
				<IImage source={track_ref.current?.playback?.artwork} width={70} height={70} />
				<View style={{ marginHorizontal: 10 }}>
					<Text numberOfLines={1} style={{ top: 8, color: colors.text, fontWeight: "bold", fontSize: 24 }}>
						{track_ref.current?.title || ""}
					</Text>
					<Text style={{ top: 6, color: colors.text, fontSize: 14 }}>{artist_string(track_ref.current!)}</Text>
					<Text style={{ top: 6, color: colors.text, fontSize: 14 }}>{track_ref.current?.album?.name ?? ""}</Text>
				</View>
			</View>
			<View style={{ height: 10 }} />
			{track_ref.current?.media_uri !== undefined ? (
				<View>
					<Waveform mode="static" ref={waveform_ref} path={SQLfs.media_directory(track_ref.current?.media_uri)} candleSpace={0.1} candleWidth={0.5} candleHeightScale={10} scrubColor={colors.secondary} waveColor={colors.text} containerStyle={{ height: 100 }} onPlayerStateChange={(player_state) => set_playerstate(player_state)} onCurrentProgressChange={(scrubber_position) => set_scrubber(round_decimal_place(scrubber_position, 2))} />
					<View style={{ position: "absolute", width: selected_left_percent, height: 90, backgroundColor: colors.red, zIndex: 10, top: 5, left: 0, opacity: 0.4, pointerEvents: "box-none" }}></View>
					<View style={{ position: "absolute", width: selected_right_percent, height: 90, backgroundColor: colors.red, zIndex: 10, top: 5, left: selected_right_percent, opacity: 0.4, pointerEvents: "box-none" }}></View>
				</View>
			) : null}
			<View style={{ height: 70 }} />
			<View style={{ flexDirection: "row", justifyContent: "space-evenly", zIndex: 10 }}>
				<TouchableOpacity style={{ alignSelf: "center", borderRadius: 5, bottom: 50, alignItems: "center", justifyContent: "center", margin: "1%" }} onPress={() => set_left_trim(0)}>
					<MaterialIcons size={40} name="restart-alt" color={colors.text} />
				</TouchableOpacity>
				<TouchableOpacity style={{ alignSelf: "center", borderRadius: 10, bottom: 50, alignItems: "center", justifyContent: "center", margin: "1%" }} onPress={() => set_left_trim(round_decimal_place(scrubber / 1000, 2))}>
					<FontAwesome6 size={35} name="arrow-right-from-bracket" color={colors.text} />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => {
						playerstate === PlayerState.playing ? waveform_ref.current?.pausePlayer() : waveform_ref.current?.startPlayer();
					}}
					style={{ alignSelf: "center", bottom: 50 }}>
					<Ionicons name={playerstate === PlayerState.playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary} />
				</TouchableOpacity>
				<TouchableOpacity style={{ alignSelf: "center", borderRadius: 10, bottom: 50, alignItems: "center", justifyContent: "center", margin: "1%", transform: [{ rotate: "180deg" }] }} onPress={() => set_right_trim(round_decimal_place(scrubber / 1000, 2))}>
					<FontAwesome6 size={35} name="arrow-right-from-bracket" color={colors.text} />
				</TouchableOpacity>
				<TouchableOpacity style={{ alignSelf: "center", borderRadius: 5, bottom: 50, alignItems: "center", justifyContent: "center", margin: "1%" }} onPress={() => set_right_trim(track_ref.current?.duration ?? 1)}>
					<MaterialIcons size={40} name="restart-alt" color={colors.text} />
				</TouchableOpacity>
			</View>
			<TouchableOpacity style={{ width: "90%", alignSelf: "center", height: 60, top: "2%", backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: "center", justifyContent: "center", zIndex: 10 }} onPress={async () => save_selection()}>
				<Text style={{ color: colors.text, fontSize: 24, fontWeight: "600" }}>Save Trimming</Text>
			</TouchableOpacity>
		</View>
	);
}
