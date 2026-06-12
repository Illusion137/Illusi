import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import { Elscione } from "@origin/elscione/elscione";
import type { Item } from "@origin/elscione/types";
import { CookieJar } from "@common/utils/cookie_util";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import ElscioneItem from "@components/audiobook/ElscioneItem";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import { AudiobookDownloads } from "@illusive/audiobook_downloads";

const INITIAL_PATH = "/Officially%20Translated%20Light%20Novels/";

const FORMAT_PREFERENCE = ["epub", "azw3", "mobi", "pdf", "djvu"];

const ELSCIONE_COOKIE_JAR = new CookieJar([]);

interface Frame {
	path: string;
	items: Item[];
	cached: boolean;
	scroll_offset: number;
}

function file_extension(href: string): string {
	const trimmed = href.endsWith("/") ? href.slice(0, -1) : href;
	const last_slash = trimmed.lastIndexOf("/");
	const name = last_slash === -1 ? trimmed : trimmed.slice(last_slash + 1);
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function file_stem(href: string): string {
	const trimmed = href.endsWith("/") ? href.slice(0, -1) : href;
	const last_slash = trimmed.lastIndexOf("/");
	const name = last_slash === -1 ? trimmed : trimmed.slice(last_slash + 1);
	const dot = name.lastIndexOf(".");
	const stem = dot === -1 ? name : name.slice(0, dot);
	const parent = last_slash === -1 ? "" : trimmed.slice(0, last_slash + 1);
	return parent + stem.toLowerCase();
}

function dedupe_preferred_formats(items: Item[]): Item[] {
	const groups = new Map<string, Item[]>();
	const passthrough: Item[] = [];
	for (const item of items) {
		if (item.href.endsWith("/")) {
			passthrough.push(item);
			continue;
		}
		const ext = file_extension(item.href);
		if (!FORMAT_PREFERENCE.includes(ext)) {
			passthrough.push(item);
			continue;
		}
		const key = file_stem(item.href);
		const bucket = groups.get(key);
		if (bucket === undefined) groups.set(key, [item]);
		else bucket.push(item);
	}
	const kept: Item[] = [];
	for (const bucket of groups.values()) {
		bucket.sort((a, b) => FORMAT_PREFERENCE.indexOf(file_extension(a.href)) - FORMAT_PREFERENCE.indexOf(file_extension(b.href)));
		kept.push(bucket[0]);
	}
	return [...passthrough, ...kept];
}

export default function ElscioneScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const cookie_jar = useRef<CookieJar>(ELSCIONE_COOKIE_JAR);
	const frame_stack = useRef<Frame[]>([]);
	const [current_frame, set_current_frame] = useState<Frame | null>(null);
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [query, set_query] = useState("");
	const [added_uris, set_added_uris] = useState<Set<string>>(new Set());

	const load_path = useCallback(
		async (path: string, push_to_stack: boolean) => {
			set_loading(true);
			set_error(null);
			// Elscione's built-in filter compares item.href.includes(path) verbatim
			// — server hrefs are decoded, our paths are %-encoded, so the match
			// fails for every nested directory. Filter on our side after decoding.
			const result = await Elscione.view_path({ cookie_jar: cookie_jar.current, path, filter: false });
			set_loading(false);
			if ("error" in result) {
				set_error(result.error.message);
				return;
			}
			const decoded_path = safe_decode(path);
			const scoped = result.items.filter((it) => {
				const decoded_href = safe_decode(it.href);
				return decoded_href.includes(decoded_path) || it.href.includes(path);
			});
			const new_frame: Frame = { path, items: dedupe_preferred_formats(scoped), cached: result.cached, scroll_offset: 0 };
			if (push_to_stack && current_frame !== null) frame_stack.current.push(current_frame);
			set_current_frame(new_frame);
			set_query("");
		},
		[current_frame]
	);

	useEffect(() => {
		load_path(INITIAL_PATH, false);
		(async () => {
			const existing = await SQLAudiobook.get_all_audiobooks();
			set_added_uris(new Set(existing.map((a) => a.source_raw_uri).filter((u) => u.length > 0)));
		})();
	}, []);

	function safe_decode(s: string): string {
		try {
			return decodeURIComponent(s);
		} catch {
			return s;
		}
	}

	function derive_title(item: Item): string {
		const trimmed = item.href.endsWith("/") ? item.href.slice(0, -1) : item.href;
		const idx = trimmed.lastIndexOf("/");
		const raw = idx === -1 ? trimmed : trimmed.slice(idx + 1);
		const decoded = safe_decode(raw);
		const dot = decoded.lastIndexOf(".");
		return dot === -1 ? decoded : decoded.slice(0, dot);
	}

	async function on_add_to_library(item: Item) {
		const url = Elscione.select_item(item);
		if (added_uris.has(url)) return;
		set_added_uris((prev) => {
			const next = new Set(prev);
			next.add(url);
			return next;
		});
		// Hands off to the download manager: it inserts the placeholder row, then
		// downloads (resumably, with progress) + finalizes in the background. The
		// epub cover enhancement runs inside finalize via a GLOBALS host hook.
		const result = await AudiobookDownloads.enqueue_remote_import({ url, title: derive_title(item), source_file_type: "ELSCIONE", cookie_jar: cookie_jar.current });
		if ("error" in result && result.error) {
			// Roll back the optimistic add so the user can retry.
			set_added_uris((prev) => {
				const next = new Set(prev);
				next.delete(url);
				return next;
			});
		}
	}

	function on_press_item(item: Item) {
		if (item.href.endsWith("/")) {
			load_path(item.href, true);
		} else {
			Clipboard.setString(Elscione.select_item(item));
		}
	}

	function on_back() {
		const prev = frame_stack.current.pop();
		if (prev !== undefined) set_current_frame(prev);
	}

	function on_refresh() {
		if (current_frame !== null) load_path(current_frame.path, false);
	}

	function on_copy_link(item: Item) {
		Clipboard.setString(Elscione.select_item(item));
	}

	const path_breadcrumb = current_frame?.path ?? INITIAL_PATH;
	const filtered_items = current_frame?.items.filter((it) => (query.length === 0 ? true : it.href.toLowerCase().includes(query.toLowerCase()))) ?? [];

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<View style={[styles.header, { backgroundColor: colors.shelf }]}>
				<View style={styles.header_row}>
					<TouchableOpacity onPress={on_back} disabled={frame_stack.current.length === 0} style={styles.icon_btn}>
						<Ionicons name="chevron-back" size={22} color={frame_stack.current.length === 0 ? colors.deeptext : colors.primary} />
					</TouchableOpacity>
					<Text style={[styles.path_text, { color: colors.text }]} numberOfLines={1}>
						{safe_decode(path_breadcrumb)}
					</Text>
					<TouchableOpacity onPress={on_refresh} style={styles.icon_btn}>
						<Ionicons name="refresh" size={20} color={colors.primary} />
					</TouchableOpacity>
				</View>
				<View style={styles.meta_row}>
					<Text style={[styles.meta_text, { color: colors.subtext }]}>{current_frame !== null ? (current_frame.cached ? "Cached" : "Fresh") : "..."}</Text>
					<Text style={[styles.meta_text, { color: colors.subtext }]}>{current_frame !== null ? `${current_frame.items.length} items` : ""}</Text>
				</View>
				<View style={[styles.search_bar, { backgroundColor: colors.searchInput }]}>
					<Ionicons name="search" size={15} color={colors.subtext} />
					<TextInput style={[styles.search_input, { color: colors.text }]} placeholder="Filter items..." placeholderTextColor={colors.searchPlaceholder} value={query} onChangeText={set_query} autoCorrect={false} autoCapitalize="none" />
					{query.length > 0 ? (
						<TouchableOpacity onPress={() => set_query("")}>
							<Ionicons name="close-circle" size={16} color={colors.subtext} />
						</TouchableOpacity>
					) : null}
				</View>
			</View>
			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : error !== null ? (
				<View style={styles.center}>
					<Ionicons name="warning-outline" size={48} color={colors.red} />
					<Text style={[styles.error_text, { color: colors.text }]}>{error}</Text>
					<TouchableOpacity onPress={on_refresh} style={[styles.retry_btn, { backgroundColor: colors.primary }]}>
						<Text style={styles.retry_text}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={filtered_items}
					keyExtractor={(item) => item.href}
					renderItem={({ item }) => <ElscioneItem item={item} added={added_uris.has(Elscione.select_item(item))} on_press={on_press_item} on_copy_link={on_copy_link} on_add_to_library={on_add_to_library} />}
					ListEmptyComponent={
						<View style={styles.center}>
							<Text style={[styles.empty_text, { color: colors.subtext }]}>{query.length > 0 ? "No matches" : "Empty folder"}</Text>
						</View>
					}
					contentContainerStyle={{ paddingBottom: 32 }}
				/>
			)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		root: { flex: 1 },
		header: { paddingTop: 12, paddingBottom: 10, paddingHorizontal: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
		header_row: { flexDirection: "row", alignItems: "center", gap: 6 },
		icon_btn: { padding: 6 },
		path_text: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "center" },
		meta_row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
		meta_text: { fontSize: 11, fontWeight: "600" },
		search_bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
		search_input: { flex: 1, fontSize: 14, padding: 0 },
		center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 12 },
		error_text: { fontSize: 14, textAlign: "center" },
		retry_btn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
		retry_text: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
		empty_text: { fontSize: 14 }
	});
