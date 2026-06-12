import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Prefs } from "@illusive/prefs";
import { is_empty } from "@common/utils/util";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";

const DISCORD_BLUE = "#5865F2";

export default function ExtraDiscordIntegrationScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [webhook_url, set_webhook_url] = useState<string>(Prefs.get_pref("discord_webhook_url") ?? "");
	const [is_connected, set_is_connected] = useState<boolean>(!is_empty(Prefs.get_pref("discord_webhook_url")));
	const [is_testing, set_is_testing] = useState<boolean>(false);

	async function save_webhook(url: string) {
		const trimmed = url.trim();
		await Prefs.save_pref("discord_webhook_url", trimmed);
		set_is_connected(!is_empty(trimmed));
	}

	async function clear_webhook() {
		set_webhook_url("");
		await save_webhook("");
	}

	async function test_webhook() {
		if (!is_connected || is_testing) return;
		set_is_testing(true);
		try {
			const url = Prefs.get_pref("discord_webhook_url");
			if (is_empty(url)) return;
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "Illusi webhook test ✓" })
			});
			GLOBALS.global_var.bottom_alert(
				response.ok ? "Webhook test successful" : `Webhook failed: ${response.status}`,
				response.ok ? "GOOD" : "ERROR"
			);
		} catch (e: any) {
			GLOBALS.global_var.bottom_alert(`Webhook error: ${e?.message ?? "Unknown error"}`, "ERROR");
		} finally {
			set_is_testing(false);
		}
	}

	const capabilities = [
		"Post the currently playing track to a channel",
		"Announce when you skip or pause",
		"Share track artwork and metadata with your server",
		"Control playback from Discord slash commands"
	];

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

				{/* Header card */}
				<View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
					<Ionicons name="logo-discord" size={52} color={DISCORD_BLUE} />
					<Text style={styles.header_title}>Discord Integration</Text>
					<Text style={styles.header_subtitle}>Connect Illusi to a Discord channel via Webhook to share what you're listening to.</Text>
				</View>

				{/* Webhook input card */}
				<View style={styles.card}>
					<Text style={styles.label}>WEBHOOK URL</Text>
					<View style={styles.input_row}>
						<TextInput
							autoCapitalize="none"
							autoCorrect={false}
							placeholder="https://discord.com/api/webhooks/..."
							placeholderTextColor={colors.searchPlaceholder}
							style={styles.input}
							value={webhook_url}
							onChangeText={set_webhook_url}
							onSubmitEditing={() => save_webhook(webhook_url)}
							onEndEditing={() => save_webhook(webhook_url)}
						/>
						{webhook_url.length > 0 && (
							<TouchableOpacity onPress={clear_webhook} style={{ paddingRight: 12 }}>
								<Ionicons name="close-circle" size={20} color={colors.subtext} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Status row */}
				<View style={styles.status_row}>
					<View style={[styles.status_dot, { backgroundColor: is_connected ? colors.green : colors.subtext }]} />
					<Text style={[styles.status_text, { color: is_connected ? colors.green : colors.subtext }]}>
						{is_connected ? "Connected" : "Not configured"}
					</Text>
					{is_connected && (
						<Text style={styles.url_preview} numberOfLines={1}>
							{Prefs.get_pref("discord_webhook_url")}
						</Text>
					)}
				</View>

				{/* Capabilities card */}
				<View style={styles.card}>
					<Text style={styles.section_title}>What can you do?</Text>
					<View style={styles.divider} />
					{capabilities.map((cap, i) => (
						<Text key={i} style={styles.bullet}>• {cap}</Text>
					))}
				</View>

				{/* Test webhook button */}
				<TouchableOpacity
					onPress={test_webhook}
					disabled={!is_connected || is_testing}
					style={[styles.test_btn, { backgroundColor: is_connected ? DISCORD_BLUE : colors.shelf }]}>
					{is_testing
						? <ActivityIndicator color={is_connected ? "#fff" : colors.subtext} />
						: <Text style={[styles.test_btn_text, { color: is_connected ? "#fff" : colors.subtext }]}>Test Webhook</Text>
					}
				</TouchableOpacity>

			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) => StyleSheet.create({
	card: {
		marginHorizontal: 14,
		marginTop: 16,
		backgroundColor: colors.shelf,
		borderRadius: 12,
		padding: 16
	},
	header_title: {
		color: colors.text,
		fontSize: 20,
		fontWeight: "700",
		marginTop: 12,
		textAlign: "center"
	},
	header_subtitle: {
		color: colors.subtext,
		fontSize: 13,
		marginTop: 8,
		textAlign: "center",
		lineHeight: 18
	},
	label: {
		color: colors.subtext,
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.8,
		marginBottom: 8
	},
	input_row: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.background,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.line
	},
	input: {
		flex: 1,
		padding: 11,
		color: colors.text,
		fontSize: 13
	},
	status_row: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 14,
		marginTop: 12,
		gap: 8
	},
	status_dot: {
		width: 9,
		height: 9,
		borderRadius: 5
	},
	status_text: {
		fontSize: 13,
		fontWeight: "600"
	},
	url_preview: {
		flex: 1,
		color: colors.deeptext,
		fontSize: 11
	},
	section_title: {
		color: colors.primary,
		fontSize: 15,
		fontWeight: "600",
		marginBottom: 10
	},
	divider: {
		height: 1,
		backgroundColor: colors.line,
		marginBottom: 10
	},
	bullet: {
		color: colors.subtext,
		fontSize: 13,
		lineHeight: 24
	},
	test_btn: {
		borderRadius: 10,
		marginHorizontal: 14,
		marginTop: 20,
		paddingVertical: 14,
		alignItems: "center"
	},
	test_btn_text: {
		fontWeight: "600",
		fontSize: 15
	}
});
