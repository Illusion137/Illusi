import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLDev } from "@illusive/sql/sql_dev";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import usePTheme from "@hooks/usePTheme";
import { sync_engine_instance } from "@illusive/startup";
import { check_and_apply_update, clear_quarantine, get_ota_diagnostics, list_remote_bundles, rollback_update, wipe_ota_clone, type OTADiagnostics, type OTARemoteBundle } from "@utils/ota_update";

function format_mtime(mtime: number | null): string {
	return mtime === null ? "none" : new Date(mtime).toLocaleString();
}

function OTASection() {
	const { colors } = usePTheme();
	const [diagnostics, set_diagnostics] = useState<OTADiagnostics | null>(null);
	const [remote_bundles, set_remote_bundles] = useState<OTARemoteBundle[] | null>(null);
	const [remote_error, set_remote_error] = useState("");

	const refresh = useCallback(() => {
		get_ota_diagnostics()
			.then(set_diagnostics)
			.catch(() => set_diagnostics(null));
		set_remote_error("");
		set_remote_bundles(null);
		list_remote_bundles()
			.then(set_remote_bundles)
			.catch((e) => set_remote_error(String(e)));
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	const row = (label: string, value: string) => (
		<View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 3 }}>
			<Text style={{ color: colors.subtext, fontSize: 13 }}>{label}</Text>
			<Text style={{ color: colors.text, fontSize: 13, flexShrink: 1, textAlign: "right" }} numberOfLines={1}>
				{value}
			</Text>
		</View>
	);

	return (
		<View>
			<Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6 }}>OTA Updates</Text>
			{diagnostics ? (
				<View style={{ backgroundColor: colors.track + "80", paddingVertical: 6 }}>
					{row("Enabled", diagnostics.is_dev ? "no (dev build — Metro serves JS)" : diagnostics.enabled ? "yes" : "no")}
					{row("Binary version", diagnostics.binary_version ?? "unknown")}
					{row("Branch (expected)", diagnostics.expected_branch ?? "unknown")}
					{row("Branch (cloned)", diagnostics.cloned_branch ?? "not cloned yet")}
					{row("Running bundle", diagnostics.running_bundle)}
					{row("Pulled bundle", format_mtime(diagnostics.bundle_mtime))}
					{row("Quarantined", diagnostics.quarantined_mtime === null ? "no" : `yes (${format_mtime(diagnostics.quarantined_mtime)})`)}
					{row("Crash counter", String(diagnostics.crash_counter))}
				</View>
			) : (
				<Text style={{ color: colors.subtext, fontSize: 13, paddingHorizontal: 14 }}>Loading…</Text>
			)}
			<Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>Remote bundles for this version</Text>
			{remote_error !== "" ? <Text style={{ color: "#CC5555", fontSize: 12, paddingHorizontal: 14 }}>{remote_error}</Text> : null}
			{remote_bundles === null && remote_error === "" ? <Text style={{ color: colors.subtext, fontSize: 13, paddingHorizontal: 14 }}>Loading…</Text> : null}
			{remote_bundles !== null && remote_bundles.length === 0 ? <Text style={{ color: colors.subtext, fontSize: 13, paddingHorizontal: 14 }}>No branch on the OTA repo for this version yet — run `yarn ota:release`.</Text> : null}
			{remote_bundles?.map((bundle, index) => (
				<View key={bundle.sha} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
					<Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
						{bundle.sha.slice(0, 7)} {index === 0 ? "(latest) " : ""}
						{bundle.message}
					</Text>
					<Text style={{ color: colors.subtext, fontSize: 11 }}>{bundle.date === "" ? "unknown date" : new Date(bundle.date).toLocaleString()}</Text>
				</View>
			))}
			<ExtrasSectionButton show_arrow={false} text="Refresh OTA status" icon="refresh-outline" onPress={refresh} />
			<ExtrasSectionButton
				show_arrow={false}
				text="Check for OTA update now"
				icon="cloud-download-outline"
				onPress={() => {
					// No-op in dev builds by design (Metro serves the JS).
					check_and_apply_update()
						.catch((e) => e)
						.finally(() => setTimeout(refresh, 2000));
				}}
			/>
			<ExtrasSectionButton
				show_arrow={false}
				text="Clear OTA quarantine"
				icon="medkit-outline"
				onPress={() => {
					clear_quarantine()
						.catch((e) => e)
						.finally(refresh);
				}}
			/>
			<ExtrasSectionButton
				show_arrow={false}
				text="Wipe OTA clone"
				icon="trash-outline"
				onPress={() => {
					if_confirm("Wipe the on-device OTA clone?", "The next check will clone fresh.", async () => {
						await wipe_ota_clone().catch((e) => e);
						refresh();
					});
				}}
			/>
			<ExtrasSectionButton
				show_arrow={false}
				text="Rollback to embedded bundle"
				icon="arrow-undo-outline"
				onPress={() => {
					if_confirm("Rollback to the embedded bundle?", "The current OTA bundle gets quarantined until a newer push. Takes effect on next restart.", async () => {
						await rollback_update().catch((e) => e);
						refresh();
					});
				}}
			/>
		</View>
	);
}

export default function ExtraDeveloperScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	async function exportSQLData() {
		await Sharing.shareAsync(FileSystem.documentDirectory + "SQLite");
	}

	return (
		<ScrollView style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			<ExtrasSectionButton
				show_arrow={true}
				text="Load SQLite DB"
				icon="hammer-outline"
				onPress={async () => {
					SQLDev.fetch_and_load_new_sqlite_file();
				}}
			/>
			<ExtrasSectionButton
				show_arrow={true}
				text="Mark Data Synced"
				icon="hammer-outline"
				onPress={async () => {
					sync_engine_instance?.mark_all_tables_synced_now();
					Prefs.save_pref("last_synced", new Date());
				}}
			/>
			<ExtrasSectionButton
				show_arrow={true}
				text="Load Playlists from Playlist-Tracks"
				icon="hammer-outline"
				onPress={async () => {
					if_confirm("Are you sure?", "", async () => {
						// await playlists_from_playlists_tracks();
					});
				}}
			/>
			<ExtrasSectionButton
				show_arrow={true}
				text="Undownload all tracks"
				icon="hammer-outline"
				onPress={async () => {
					if_confirm("Are you sure?", "", async () => {
						await SQLTracks.mark_all_tracks_undownloaded();
					});
				}}
			/>
			<OTASection />
			<View style={{ flexDirection: "row", height: 100 }}>
				<TouchableOpacity style={styles.button} onPress={exportSQLData}>
					<Text style={styles.button_text}>Export SQL Data</Text>
				</TouchableOpacity>
			</View>
			{/* <TextInput
				style={{ height: "15%", width: "100%", backgroundColor: "#302060", color: "white", padding: 5 }}
				placeholder="Enter SQL Statement..."
				onChangeText={(input) => {
					sql_statement = input;
				}}
			/>
			<View style={{ height: 80 }} /> */}
			{/* <View style={{height: 50}}/>
			<ScrollView horizontal={true}>
				<View>
					<Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
						<Row data={sqlState.columns} widthArr={width_array} style={styles.header} textStyle={styles.text}/>
					</Table>
					<ScrollView style={styles.dataWrapper}>
						<Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
							{
							sqlState.rows.map((row_data, index) => (
								<Row
								key={index}
								data={row_data}
								widthArr={width_array}
								style={[styles.row, index%2 && {backgroundColor: '#F7F6E7'}]}
								textStyle={styles.text}
								/>
							))
							}
						</Table>
					</ScrollView>
          		</View>
        	</ScrollView> */}
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		button: { backgroundColor: "#201050", width: "33%", height: "100%", borderRadius: 10, justifyContent: "center", alignItems: "center" },
		button_text: { color: colors.text, fontWeight: "bold", width: 100, textAlign: "center" },
		container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: "#fff" },
		header: { height: 50, backgroundColor: "#537791" },
		text: { textAlign: "center", fontWeight: "100" },
		dataWrapper: { marginTop: -1 },
		row: { height: 40, backgroundColor: "#E7E6E1" }
	});
