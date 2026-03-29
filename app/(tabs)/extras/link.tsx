import { TimedCache } from "@common/types";
import { gen_uuid, milliseconds_of } from "@common/utils/util";
import IImage from "@components/IImage";
import ModalHeader from "@components/ModalHeader";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { alert_error } from "@illusive/illusi/src/alert";
import { Illusive } from "@illusive/illusive";
import { create_uri, music_service_to_music_service_uri } from "@illusive/illusive_utils";
import { Prefs } from "@illusive/prefs";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import type { LinkerLink, MusicServiceType } from "@illusive/types";
import { get_common_styles } from "@utils/common_styles";
import { router, useLocalSearchParams } from "expo-router";
import hexToRgba from "hex-to-rgba";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Switch, Text, TouchableOpacity, View } from "react-native";
import { SelectList } from "react-native-dropdown-select-list";

function sorted_music_service_entries(type: MusicServiceType) {
	const entries = Array.from(Illusive.music_service.entries())
		.filter((e) => e[0] !== "API" && e[0] !== "BandLab")
		.filter((e) => e[0] === "Illusi" || (Illusive.music_service.get(e[0])!.has_credentials() && Illusive.music_service.get(e[0])!.add_tracks_to_playlist))
		.sort((e1, e2) => e1[0].localeCompare(e2[0]));
	const index = entries.findIndex((e) => e[0] === type);
	[entries[0], entries[index]] = [entries[index], entries[0]];
	return entries;
}

const service_selector_size = (Dimensions.get("window").width - 40 - Illusive.music_service.size * 2) / (Illusive.music_service.size - 2);
export interface ServiceSelectorHandle {
	force_set_selected: (type: MusicServiceType) => void;
}
export interface ServiceSelectorProps {
	prefix: string;
	on_select: (type: MusicServiceType) => any;
}
const ServiceSelector = forwardRef<ServiceSelectorHandle, ServiceSelectorProps>((props: ServiceSelectorProps, ref) => {
	const { colors } = usePTheme();
	const common_styles = get_common_styles(colors);
	const [selected, set_selected] = useState<MusicServiceType>("Illusi");
	const [is_selecting, set_is_selecting] = useState(false);

	const force_set_selected = (type: MusicServiceType) => set_selected(type);

	useImperativeHandle(ref, () => ({
		force_set_selected
	}));

	const entries = useMemo(() => sorted_music_service_entries(selected), [selected]);

	const anim = useRef(entries.map(() => new Animated.Value(0))).current;

	useEffect(() => {
		Animated.stagger(
			40,
			anim.map((v) =>
				Animated.spring(v, {
					toValue: is_selecting ? 1 : 0,
					useNativeDriver: true,
					friction: 8,
					tension: 80
				})
			)
		).start();
	}, [is_selecting]);

	function on_select(type: MusicServiceType) {
		set_is_selecting(false);
		set_selected(type);
		props.on_select(type);
	}

	return (
		<>
			<View style={{ height: service_selector_size }}>
				<View style={{ flexDirection: "row" }}>
					{entries.map(([type, data], index) => {
						const translateX = anim[index].interpolate({ inputRange: [0, 1], outputRange: [0, index * (service_selector_size + 2)] });
						const scale = anim[index].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
						const opacity = anim[index].interpolate({ inputRange: [0, 1], outputRange: [index === 0 ? 1 : 0, 1] });

						return (
							<Animated.View key={type} style={{ position: "absolute", transform: [{ translateX }, { scale }], opacity }}>
								<TouchableOpacity onPress={() => (is_selecting ? on_select(type) : set_is_selecting(true))}>
									<IImage source={data.app_icon} style={{ width: service_selector_size, height: service_selector_size, marginRight: 2 }} />
								</TouchableOpacity>
							</Animated.View>
						);
					})}
				</View>
				{!is_selecting && (
					<View style={{ position: "absolute", left: service_selector_size + 10, top: service_selector_size / 4 }}>
						<Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold" }}>{selected}</Text>
					</View>
				)}
			</View>
			<Text style={[common_styles.description_txt, { marginBottom: 0, marginTop: 5 }]}>{props.prefix} Press on icon to switch to a different service</Text>
		</>
	);
});

const user_playlists_cache = new TimedCache<MusicServiceType, { key: string; value: string }[]>(milliseconds_of({ hours: 1 }));
function PlaylistSelector(props: { type: MusicServiceType; on_select: (key: string) => void; default_key?: string }) {
	const { colors } = usePTheme();
	const [playlists_group, set_playlists_group] = useState<{ key: string; value: string }[]>([]);

	useEffect(() => {
		(async () => {
			if (props.type === "Illusi") {
				const playlists = await SQLPlaylists.all_playlists_data("IGNORE");
				set_playlists_group(playlists.map((p) => ({ key: p.uuid, value: p.title })));
			} else {
				const cache_response = user_playlists_cache.get(props.type);
				if (cache_response) {
					set_playlists_group(cache_response);
					return;
				}
				const playlists = (await Illusive.music_service.get(props.type)?.get_user_playlists?.()) ?? { playlists: [] };
				if ("error" in playlists) {
					alert_error(playlists);
					set_playlists_group([]);
					return;
				}
				const pairs = playlists.playlists.map((p) => ({ key: p.title.uri ?? "", value: p.title.name }));
				user_playlists_cache.add(props.type, pairs);
				set_playlists_group(pairs);
			}
		})();
	}, [props.type]);

	const default_option = useMemo(() => {
		if (props.default_key) return playlists_group.find((p) => p.key === props.default_key) ?? playlists_group[0];
		return playlists_group[0];
	}, [playlists_group, props.default_key]);

	return (
		<View style={{ width: "100%", height: 80, justifyContent: "center", zIndex: 100 }}>
			<SelectList
				setSelected={(key: string) => props.on_select(key)}
				data={playlists_group}
				save="key"
				arrowicon={<></>}
				closeicon={<Ionicons name="close" size={20} color={colors.red} />}
				searchicon={<></>}
				searchPlaceholder={"Select Playlist"}
				placeholder="Select Playlist"
				defaultOption={default_option}
				inputStyles={{ backgroundColor: colors.track, color: "white" }}
				boxStyles={{ backgroundColor: colors.background, borderColor: colors.primary, borderRadius: 5 }}
				dropdownStyles={{ backgroundColor: colors.background }}
				dropdownTextStyles={{ color: colors.text }}
			/>
		</View>
	);
}

function LabelSwitch(props: { label: string; description?: string; default_value?: boolean; on_change: (value: boolean) => void }) {
	const { colors } = usePTheme();
	const common_styles = get_common_styles(colors);

	const [is_enabled, set_is_enabled] = useState(props.default_value ?? false);
	const toggle_switch = () => {
		const next = !is_enabled;
		set_is_enabled(next);
		props.on_change(next);
	};

	return (
		<>
			<View style={{ flexDirection: "row", alignItems: "center" }}>
				<Switch trackColor={{ true: colors.primary }} value={is_enabled} onValueChange={toggle_switch} />
				<Text style={{ color: colors.text, fontSize: 16, marginLeft: 10, fontWeight: "600" }}>{props.label}</Text>
			</View>
			{props.description ? <Text style={[common_styles.description_txt]}>{props.description}</Text> : null}
		</>
	);
}

interface LinkFormData {
	service1_from: MusicServiceType;
	service1_from_url: string;
	service2_to: MusicServiceType;
	service2_to_url: string;
	full_playlist: boolean;
	on_startup: boolean;
}

export default function ExtrasLinkModal() {
	const { linker_uuid } = useLocalSearchParams<{ linker_uuid?: string }>();
	const { colors } = usePTheme();

	const base_music_service_entries = useRef(sorted_music_service_entries("Illusi"));
	const base_music_service_other = useRef<MusicServiceType>(base_music_service_entries.current.filter((e) => e[0] !== "Illusi")?.[0]?.[0] ?? "YouTube");
	const from_ref = useRef<ServiceSelectorHandle>(null);
	const to_ref = useRef<ServiceSelectorHandle>(null);

	const existing_link = useRef<LinkerLink | null>(linker_uuid ? Prefs.get_pref("linker_links").find((l) => l.link_uuid === linker_uuid) ?? null : null);

	const initial_from = useRef<MusicServiceType>(existing_link.current?.type === "INCOMING" ? base_music_service_other.current : "Illusi");
	const initial_to = useRef<MusicServiceType>(existing_link.current?.type === "OUTGOING" ? base_music_service_other.current : "Illusi");

	const [from_state, set_from_state] = useState<MusicServiceType>(initial_from.current);
	const [to_state, set_to_state] = useState<MusicServiceType>(initial_to.current);

	const form_data = useRef<LinkFormData>({
		service1_from: initial_from.current,
		service1_from_url: existing_link.current?.type === "OUTGOING" ? existing_link.current.illusi_uuid : "",
		service2_to: initial_to.current,
		service2_to_url: existing_link.current?.type === "INCOMING" ? existing_link.current.illusi_uuid : "",
		full_playlist: existing_link.current?.full_service_playlist ?? false,
		on_startup: existing_link.current?.on_startup ?? false
	});

	function update_from(type: MusicServiceType) {
		form_data.current.service1_from = type;
		form_data.current.service1_from_url = "";
		set_from_state(type);
		if (type === "Illusi" && to_state === "Illusi") {
			form_data.current.service2_to = base_music_service_other.current;
			form_data.current.service2_to_url = "";
			set_to_state(base_music_service_other.current);
			to_ref.current?.force_set_selected(base_music_service_other.current);
		} else if (type !== "Illusi") {
			form_data.current.service2_to = "Illusi";
			form_data.current.service2_to_url = "";
			set_to_state("Illusi");
			to_ref.current?.force_set_selected("Illusi");
		}
	}

	function update_to(type: MusicServiceType) {
		form_data.current.service2_to = type;
		form_data.current.service2_to_url = "";
		set_to_state(type);
		if (type === "Illusi" && from_state === "Illusi") {
			form_data.current.service1_from = base_music_service_other.current;
			form_data.current.service1_from_url = "";
			set_from_state(base_music_service_other.current);
			from_ref.current?.force_set_selected(base_music_service_other.current);
		} else if (type !== "Illusi") {
			form_data.current.service1_from = "Illusi";
			form_data.current.service1_from_url = "";
			set_from_state("Illusi");
			from_ref.current?.force_set_selected("Illusi");
		}
	}

	function validate_form_data(): boolean {
		if (form_data.current.service1_from !== "Illusi" && form_data.current.service2_to !== "Illusi") {
			Alert.alert("One selected service must be Illusi", "Please select one service as Illusi");
			return false;
		}
		if (form_data.current.service1_from === "Illusi" && form_data.current.service2_to === "Illusi") {
			Alert.alert("Both selected service can NOT be Illusi", "Please select a different service besides just Illusi");
			return false;
		}
		if (!form_data.current.service1_from_url) {
			Alert.alert("Missing selection", "Please select a source playlist.");
			return false;
		}
		if (!form_data.current.service2_to_url) {
			Alert.alert("Missing selection", "Please select a destination playlist.");
			return false;
		}
		return true;
	}

	function get_linker_link(): LinkerLink {
		const link_base = {
			link_uuid: linker_uuid ?? gen_uuid(),
			on_startup: form_data.current.on_startup,
			full_service_playlist: form_data.current.full_playlist
		};
		if (form_data.current.service1_from === "Illusi") {
			return {
				...link_base,
				type: "OUTGOING",
				illusi_uuid: form_data.current.service1_from_url,
				service_uri: create_uri(music_service_to_music_service_uri(form_data.current.service2_to), form_data.current.service2_to_url)
			};
		} else {
			return {
				...link_base,
				type: "INCOMING",
				illusi_uuid: form_data.current.service2_to_url,
				service_uri: create_uri(music_service_to_music_service_uri(form_data.current.service1_from), form_data.current.service1_from_url)
			};
		}
	}

	function save_link() {
		if (!validate_form_data()) return;
		const links = Prefs.get_pref("linker_links");
		if (linker_uuid) {
			const linker_index = links.findIndex((link) => link.link_uuid === linker_uuid);
			if (linker_index === -1) {
				Alert.alert("Link not found", "This link no longer exists.");
				router.dismissTo("/extras/linker");
				return;
			}
			links[linker_index] = get_linker_link();
		} else {
			links.push(get_linker_link());
		}
		Prefs.save_pref("linker_links", links);
		router.back();
	}

	useEffect(() => {
		if (base_music_service_entries.current.length <= 1) {
			Alert.alert("Not enough external-services to create a link.", "Add external-services in the extras/external-services tab.");
			router.dismissTo("/extras/linker");
			return;
		}
		from_ref.current?.force_set_selected(from_state);
		to_ref.current?.force_set_selected(to_state);
	}, []);

	return (
		<>
			<ModalHeader title="Link" />
			<View style={{ marginHorizontal: 20 }}>
				<View style={{ height: 25 }} />
				<ServiceSelector ref={from_ref} prefix="From: " on_select={update_from} />
				<PlaylistSelector
					type={from_state}
					on_select={(key) => {
						form_data.current.service1_from_url = key;
					}}
					default_key={form_data.current.service1_from_url || undefined}
				/>
				<ServiceSelector ref={to_ref} prefix="To: " on_select={update_to} />
				<PlaylistSelector
					type={to_state}
					on_select={(key) => {
						form_data.current.service2_to_url = key;
					}}
					default_key={form_data.current.service2_to_url || undefined}
				/>
				<LabelSwitch
					label="Full Playlist"
					description="This link (for the services that are NOT Illusi) will extract the entire playlist rather than one segment. (This could be an expensive operation)."
					default_value={form_data.current.full_playlist}
					on_change={(v) => {
						form_data.current.full_playlist = v;
					}}
				/>
				<LabelSwitch
					label="On Startup"
					description="This link will run everytime the app starts, if pref[expensive_wifi_only] then, this will only happen if connected to WiFi."
					default_value={form_data.current.on_startup}
					on_change={(v) => {
						form_data.current.on_startup = v;
					}}
				/>
				<View style={{ width: "100%", justifyContent: "center", alignItems: "center", marginTop: 40 }}>
					<TouchableOpacity onPress={save_link} style={{ backgroundColor: hexToRgba(colors.primary, 0.8), padding: 10, paddingHorizontal: 20, borderRadius: 3 }}>
						<Text style={{ color: colors.text }}>{linker_uuid ? "Update" : "Save"} Link</Text>
					</TouchableOpacity>
				</View>
			</View>
		</>
	);
}
