import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Item } from "@origin/elscione/types";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { ContextMenuView } from "@components/ContextMenu";

export interface ElscioneItemProps {
	item: Item;
	added?: boolean;
	on_press?: (item: Item) => void;
	on_long_press?: (item: Item) => void;
	on_download?: (item: Item) => void;
	on_copy_link?: (item: Item) => void;
	on_add_to_library?: (item: Item) => void;
}

function safe_decode(s: string): string {
	try {
		return decodeURIComponent(s);
	} catch {
		return s;
	}
}

function format_size(bytes: number | undefined): string {
	if (bytes === undefined || bytes <= 0) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unit_index = 0;
	while (value >= 1024 && unit_index < units.length - 1) {
		value /= 1024;
		unit_index += 1;
	}
	return `${value.toFixed(value >= 100 || unit_index === 0 ? 0 : 1)} ${units[unit_index]}`;
}

function format_time(epoch_seconds: number): string {
	if (!epoch_seconds) return "";
	const date = new Date(epoch_seconds * 1000);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString();
}

function basename(href: string): string {
	const trimmed = href.endsWith("/") ? href.slice(0, -1) : href;
	const idx = trimmed.lastIndexOf("/");
	return safe_decode(idx === -1 ? trimmed : trimmed.slice(idx + 1));
}

export default function ElscioneItem(props: ElscioneItemProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const is_dir = props.item.href.endsWith("/");
	const name = basename(props.item.href);

	return (
		<ContextMenuView
			menuConfig={{
				menuTitle: name,
				menuItems: [
					{ actionKey: "elscione-open", actionTitle: is_dir ? "Open Folder" : "Open File", icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: is_dir ? "folder" : "doc" } } },
					{ actionKey: "elscione-add", actionTitle: props.added ? "Added to Library" : "Add to Library", menuAttributes: is_dir || props.added ? (is_dir ? ["hidden"] : ["disabled"]) : undefined, icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: props.added ? "checkmark.circle" : "plus.circle" } } },
					{ actionKey: "elscione-download", actionTitle: "Download", menuAttributes: is_dir ? ["hidden"] : undefined, icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "arrow.down.circle" } } },
					{ actionKey: "elscione-copy-link", actionTitle: "Copy Link", icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "link" } } }
				]
			}}
			onPressMenuItem={({ nativeEvent }) => {
				switch (nativeEvent.actionKey) {
					case "elscione-open":
						props.on_press?.(props.item);
						break;
					case "elscione-add":
						props.on_add_to_library?.(props.item);
						break;
					case "elscione-download":
						props.on_download?.(props.item);
						break;
					case "elscione-copy-link":
						props.on_copy_link?.(props.item);
						break;
					default:
						break;
				}
			}}>
			<TouchableOpacity
				activeOpacity={0.7}
				style={styles.row}
				onPress={() => props.on_press?.(props.item)}
				onLongPress={() => props.on_long_press?.(props.item)}
				delayLongPress={Constants.long_press_delay}>
				<Ionicons
					name={is_dir ? "folder" : "document-text-outline"}
					size={22}
					color={is_dir ? colors.primary : colors.subtext}
					style={{ width: 28 }}
				/>
				<View style={styles.meta}>
					<Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
						{name || props.item.href}
					</Text>
					<Text style={[styles.sub, { color: colors.subtext }]} numberOfLines={1}>
						{[format_time(props.item.time), format_size(props.item.size)].filter(Boolean).join(" • ")}
					</Text>
				</View>
				{is_dir ? (
					<Ionicons name="chevron-forward" size={18} color={colors.deeptext} />
				) : (
					<TouchableOpacity onPress={() => props.on_add_to_library?.(props.item)} disabled={props.added} hitSlop={8} style={styles.add_btn}>
						<Ionicons
							name={props.added ? "checkmark-circle" : "add-circle-outline"}
							size={24}
							color={props.added ? colors.green : colors.primary}
						/>
					</TouchableOpacity>
				)}
			</TouchableOpacity>
			<View style={[styles.divider, { backgroundColor: colors.line }]} />
		</ContextMenuView>
	);
}

const theme_styles = (_colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 11,
			paddingHorizontal: 14,
			gap: 8
		},
		meta: {
			flex: 1,
			gap: 2
		},
		name: {
			fontSize: 14,
			fontWeight: "600"
		},
		sub: {
			fontSize: 11
		},
		divider: {
			height: StyleSheet.hairlineWidth,
			marginLeft: 50
		},
		add_btn: {
			padding: 2
		}
	});
