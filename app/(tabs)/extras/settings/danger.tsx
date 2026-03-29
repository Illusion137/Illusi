import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { GLOBALS } from "@illusive/globals";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { SQLNewReleases } from "@illusive/sql/sql_new_releases";
import { Prefs } from "@illusive/prefs";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import usePTheme from "@hooks/usePTheme";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { SQLRecentlyPlayed } from "@illusive/sql/sql_recently_played";

// TODO add clean directories
export default function ExtraDangerScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	return (
		<ScrollView style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			<View style={styles.line_long} />
			<View style={{ height: 30 }} />
			<ExtrasSectionButton show_arrow={false} text="Clear Recently Played Data" icon="trash-outline" onPress={async () => if_confirm("Clear recently played tracks?", "Are You Sure?", SQLRecentlyPlayed.clear_recently_played_tracks)} />
			<ExtrasSectionButton show_arrow={false} text="Clear New Releases Cache" icon="trash-outline" onPress={async () => if_confirm("Clear new releases cache?", "Are You Sure?", SQLNewReleases.delete_all_from_new_releases)} />
			<ExtrasSectionButton show_arrow={false} text="Clear Thumbnail Cache" icon="trash-outline" onPress={async () => if_confirm("Clear thumbnail cache?", "Are You Sure?", SQLTracks.clean_thumbnail_cache)} />
			<ExtrasSectionButton
				show_arrow={false}
				text="Reset Settings"
				icon="sync"
				onPress={async () =>
					if_confirm("Reset all settings to defaults?", "Are You Sure?", async () => {
						await Prefs.reset_prefs();
						Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
					})
				}
			/>
			<View style={styles.line_short} />
			<View style={{ height: 20 }} />
			<ExtrasSectionButton show_arrow={false} text="Clear Playlist Data" icon="trash-outline" onPress={async () => if_confirm("Delete Playlist Data", "Are You Sure?", SQLPlaylists.delete_all_playlists)} />
			<ExtrasSectionButton
				show_arrow={false}
				text="Clear All Data"
				icon="trash-outline"
				onPress={async () =>
					if_confirm("Clear All Data", "Are You Sure?", async () => {
						await SQLTracks.clear_tracks();
						await SQLPlaylists.delete_all_playlists();
						await SQLRecentlyPlayed.clear_recently_played_tracks();
						await SQLNewReleases.delete_all_from_new_releases();
						await SQLArtists.clear_all_sql_artists();
					})
				}
			/>
			<View style={{ height: 200 }} />
		</ScrollView>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		thick_line_long: {
			width: "90%",
			height: 0.4,
			opacity: 1,
			backgroundColor: colors.text
		},
		line_long: {
			width: "100%",
			height: 0.4,
			opacity: 0.1,
			backgroundColor: colors.text
		},
		line_short: {
			width: "100%",
			height: 0.4,
			opacity: 0.1,
			backgroundColor: colors.text,
			marginLeft: 42
		},
		description_text: {
			color: colors.subtext,
			marginLeft: 10,
			marginTop: 5,
			marginBottom: 10,
			fontSize: 16
		}
	});
