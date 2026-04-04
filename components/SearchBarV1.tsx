import { Ionicons } from "@expo/vector-icons";
import type { NativeSyntheticEvent, TextInputProps, TextInputSelectionChangeEventData } from "react-native";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Prefs } from "@illusive/prefs";
import { useEffect, useRef, useState } from "react";
import type { QueryFlag } from "@illusive/types";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import { ANTI_QUERY_FLAG_PREFIX } from "@illusive/query_flags";
import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";

export default function SearchBarV1(props: TextInputProps & { query_flags?: QueryFlag<any>[] } & { background_color?: string }) {
	const { colors } = usePTheme();
	const [flag_query_section, set_flag_query_section] = useState<string>();
	const [input_focused, set_input_focused] = useState<boolean>(false);
	const [show_clear_button, set_show_clear_button] = useState<boolean>(false);
	const [use_strict_search, set_use_strict_search] = useState<boolean>(Prefs.get_pref("default_to_strict_search"));
	const input_ref = useRef<TextInput>(null);
	const strict_equals_flag = "@eq";
	const query_ref = useRef<string>(Prefs.get_pref("default_to_strict_search") ? strict_equals_flag + " " : "");
	const autocomplete_scrollview_ref = useRef<ScrollView>(null);

	// eslint-disable-next-line @typescript-eslint/no-deprecated
	function on_selection_change(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
		const strict_mode_change = use_strict_search ? 4 : 0;
		if (query_ref.current.includes("@") || query_ref.current.includes("!")) {
			let start_prefix_index = e.nativeEvent.selection.start - 1 + strict_mode_change;
			for (let i = start_prefix_index; i >= 0; i--) {
				if (is_empty(query_ref.current[i])) {
					start_prefix_index = -1;
					break;
				}
				if (query_ref.current[i] === "!") {
					start_prefix_index = i;
					break;
				}
				if (query_ref.current[i] === "@") {
					if (query_ref.current[i - 1] === "!") start_prefix_index = i - 1;
					else start_prefix_index = i;
					break;
				}
			}
			if (start_prefix_index !== -1) {
				const section = query_ref.current.slice(start_prefix_index, e.nativeEvent.selection.start + strict_mode_change);
				set_flag_query_section(section);
				autocomplete_scrollview_ref.current?.flashScrollIndicators();
			} else set_flag_query_section(undefined);
		} else set_flag_query_section(undefined);
	}

	function on_change_text(query: string, force_strict_mode?: boolean) {
		const modified_query = (use_strict_search && force_strict_mode !== false) || force_strict_mode === true ? strict_equals_flag + " " + query : query;
		query_ref.current = modified_query;
		props?.onChangeText?.(modified_query);
		if (modified_query.length > 0 && modified_query.trim() !== strict_equals_flag) set_show_clear_button(true);
		else set_show_clear_button(false);
	}

	function on_toggle_strict_mode() {
		if (!use_strict_search) {
			on_change_text(query_ref.current, true);
		} else {
			on_change_text(query_ref.current.replace(/^@eq /, ""), false);
		}
		set_use_strict_search((prev) => !prev);
	}

	useEffect(() => {
		autocomplete_scrollview_ref.current?.flashScrollIndicators();
	}, [autocomplete_scrollview_ref.current]);

	const maybe_query_flags = props.query_flags ?? [];
	const filtered_query_flags = maybe_query_flags
		.concat(maybe_query_flags.map((query_flag) => ({ ...query_flag, flag: ANTI_QUERY_FLAG_PREFIX + query_flag.flag, description: "NOT " + query_flag.description })))
		.filter((flag) => flag.flag.startsWith(flag_query_section ?? "-"));

	return (
		<>
			<View style={{ flexDirection: "row", height: 35, left: -5, width: "100%" }}>
				<View style={{ overflow: "hidden", backgroundColor: props.background_color ?? colors.searchInput, paddingTop: 5, paddingLeft: 5, paddingRight: 5, bottom: 0, left: 10, borderRadius: 10, zIndex: 1 }}>
					<Ionicons name="search" size={22} color={colors.searchPlaceholder} style={{ top: 1, left: 2 }} />
				</View>
				<TextInput
					{...props}
					onSelectionChange={on_selection_change}
					ref={input_ref}
					onChangeText={on_change_text}
					onBlur={() => set_input_focused(false)}
					onFocus={() => set_input_focused(true)}
					autoCorrect={false}
					placeholderTextColor={colors.searchPlaceholder}
					style={{
						backgroundColor: props.background_color ?? colors.searchInput,
						color: colors.text,
						width: "95%",
						bottom: 0,
						paddingLeft: 10,
						fontSize: 15,
						borderTopRightRadius: 10, // Top Right Corner
						borderBottomRightRadius: 10 // Bottom Right Corner
					}}
				/>
				<IoniconsTouchableOpacity
					icon_name="scan-circle-outline"
					icon_color={use_strict_search ? colors.primary : colors.subtext}
					icon_size={25}
					icon_style={{}}
					on_press={on_toggle_strict_mode}
					hitslop={5}
					style={{ position: "absolute", left: show_clear_button ? "83%" : "92%", top: "15%" }}
				/>
				{show_clear_button ? (
					<IoniconsTouchableOpacity
						icon_name="close-circle-outline"
						icon_color={colors.subtext}
						icon_size={25}
						icon_style={{}}
						on_press={() => {
							input_ref.current?.clear();
							on_change_text("");
							set_flag_query_section(undefined);
						}}
						hitslop={5}
						style={{ position: "absolute", left: "92%", top: "15%" }}
					/>
				) : null}
			</View>
			{props.query_flags && flag_query_section && input_focused && filtered_query_flags.length !== 0 ? (
				<ScrollView ref={autocomplete_scrollview_ref} style={{ position: "absolute", width: "103%", maxHeight: 400, backgroundColor: "#000000B0", top: 40, zIndex: 5, paddingHorizontal: 15, paddingVertical: 15, borderRadius: 10 }}>
					{filtered_query_flags.map((flag, i) => (
						<View key={flag.flag + String(i)} style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 1 }}>
							<Text style={{ color: colors.text, fontWeight: "600" }}>{flag.flag}</Text>
							<View style={{ width: 20 }} />
							<Text style={{ color: colors.text }}>{flag.description}</Text>
						</View>
					))}
				</ScrollView>
			) : null}
		</>
	);
}
