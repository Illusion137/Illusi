import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TextInput, TouchableHighlight, ScrollView, ActivityIndicator } from "react-native";
import type { Prefs } from "@illusive/prefs";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { IllusiAccount } from "@illusive/db/sync/illusi_account";
import { SyncEngine } from "@illusive/db/sync/sync_engine";
import type { Me } from "@origin/illusi/types";

const STATUS_TEXT: Record<SyncEngine.Status, string> = {
	IDLE: "Up to date",
	SYNCING: "Syncing…",
	OFFLINE: "Offline",
	LOGGED_OUT: "Logged out",
	ERROR: "Sync failed"
};

export default function ExtraSyncScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [logged_in, set_logged_in] = useState(() => {
		IllusiAccount.configure();
		return IllusiAccount.is_logged_in();
	});
	const [progress, set_progress] = useState<SyncEngine.Progress>(SyncEngine.get_progress());
	const [me, set_me] = useState<Me | null>(null);
	const [username, set_username] = useState("");
	const [email, set_email] = useState("");
	const [password, set_password] = useState("");
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [is_signup, set_is_signup] = useState(false);

	useEffect(() => {
		const unsubscribe_account = IllusiAccount.subscribe(set_logged_in);
		const unsubscribe_progress = SyncEngine.subscribe(set_progress);
		return () => {
			unsubscribe_account();
			unsubscribe_progress();
		};
	}, []);

	useEffect(() => {
		if (!logged_in) {
			set_me(null);
			return;
		}
		IllusiAccount.me().then((result) => {
			if (!("error" in result)) set_me(result);
		});
	}, [logged_in, progress.last_synced_at]);

	async function handle_submit() {
		set_error(null);
		set_loading(true);
		try {
			const result = is_signup ? await IllusiAccount.register({ username, email, password }) : await IllusiAccount.login({ email, password });
			if ("error" in result) set_error(result.error.message);
			else SyncEngine.sync_now();
		} finally {
			set_loading(false);
		}
	}

	async function handle_sign_out() {
		set_loading(true);
		await IllusiAccount.logout();
		set_loading(false);
	}

	if (!IllusiAccount.has_server()) {
		return (
			<ScrollView style={styles.container}>
				<View style={styles.section}>
					<View style={styles.row}>
						<Ionicons name="cloud-offline-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
						<Text style={styles.header_text}>Sync Unavailable</Text>
					</View>
					<View style={styles.line} />
					<Text style={styles.description}>No Illusi server is configured.</Text>
				</View>
			</ScrollView>
		);
	}

	const last_synced_str = progress.last_synced_at === null ? "Never" : new Date(progress.last_synced_at).toLocaleString();

	if (logged_in) {
		return (
			<ScrollView style={styles.container}>
				<View style={styles.section}>
					<View style={styles.row}>
						<Ionicons name="cloud-done-outline" size={20} color={colors.green} style={{ marginRight: 8 }} />
						<Text style={styles.header_text}>Logged In</Text>
					</View>
					<View style={styles.line} />
					<View style={styles.info_row}>
						<Text style={styles.label}>Account</Text>
						<Text style={styles.value} numberOfLines={1}>
							{me?.user.email ?? "…"}
						</Text>
					</View>
					<View style={styles.info_row}>
						<Text style={styles.label}>Status</Text>
						<Text style={styles.value} numberOfLines={1}>
							{STATUS_TEXT[progress.status]}
						</Text>
					</View>
					<View style={styles.info_row}>
						<Text style={styles.label}>Pending Changes</Text>
						<Text style={styles.value}>{progress.pending}</Text>
					</View>
					<View style={styles.info_row}>
						<Text style={styles.label}>Last Synced</Text>
						<Text style={styles.value}>{last_synced_str}</Text>
					</View>
					{me ? (
						<View style={styles.info_row}>
							<Text style={styles.label}>Server Library</Text>
							<Text style={styles.value}>{`${me.stats.tracks} tracks • ${me.stats.playlists} playlists`}</Text>
						</View>
					) : null}
					{progress.status === "ERROR" && progress.last_error ? <Text style={[styles.error_text, { marginTop: 10 }]}>{progress.last_error}</Text> : null}
				</View>

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={async () => SyncEngine.sync_now()} disabled={progress.status === "SYNCING"} style={styles.sign_out_btn}>
					<View style={styles.btn_content}>{progress.status === "SYNCING" ? <ActivityIndicator color={colors.text} /> : <Text style={styles.sign_out_text}>Sync Now</Text>}</View>
				</TouchableHighlight>

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_sign_out} disabled={loading} style={styles.sign_out_btn}>
					<View style={styles.btn_content}>{loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.sign_out_text}>Sign Out</Text>}</View>
				</TouchableHighlight>
				<View style={{ height: 100 }} />
			</ScrollView>
		);
	}

	const can_submit = email.length > 0 && password.length > 0 && (!is_signup || username.length > 0);

	return (
		<ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
			<View style={styles.section}>
				<View style={styles.row}>
					<Ionicons name="cloud-offline-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
					<Text style={styles.header_text}>{is_signup ? "Create Account" : "Sign In"}</Text>
				</View>
				<View style={styles.line} />
				<Text style={styles.description}>{is_signup ? "Create an account to back up your library and sync across devices." : "Sign in to restore your library backup or sync across devices."}</Text>

				{is_signup ? <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.subtext} autoCapitalize="none" autoCorrect={false} value={username} onChangeText={set_username} /> : null}
				<TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={set_email} />
				<TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={set_password} />

				{error && <Text style={styles.error_text}>{error}</Text>}

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_submit} disabled={loading || !can_submit} style={[styles.submit_btn, !can_submit && styles.btn_disabled]}>
					<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>{is_signup ? "Create Account" : "Sign In"}</Text>}</View>
				</TouchableHighlight>

				<TouchableHighlight
					activeOpacity={0.6}
					underlayColor="transparent"
					onPress={() => {
						set_is_signup(!is_signup);
						set_error(null);
					}}>
					<Text style={styles.toggle_text}>{is_signup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}</Text>
				</TouchableHighlight>
			</View>
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		container: { backgroundColor: colors.background, flex: 1, width: "100%" },
		section: { marginTop: 20, marginHorizontal: 14 },
		row: { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
		header_text: { color: colors.primary, fontWeight: "500", fontSize: 20 },
		line: { width: "100%", height: 1, backgroundColor: colors.line, marginBottom: 14 },
		description: { color: colors.subtext, fontSize: 13, marginBottom: 16, lineHeight: 18 },
		input: { backgroundColor: colors.shelf, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
		error_text: { color: colors.red ?? "#ff4444", fontSize: 13, marginBottom: 10 },
		submit_btn: { backgroundColor: colors.primary, borderRadius: 10, marginBottom: 12 },
		sign_out_btn: { backgroundColor: colors.shelf, borderRadius: 10, marginHorizontal: 14, marginTop: 12 },
		btn_disabled: { opacity: 0.4 },
		btn_content: { paddingVertical: 14, alignItems: "center" },
		submit_text: { color: "#fff", fontWeight: "600", fontSize: 16 },
		sign_out_text: { color: colors.text, fontWeight: "500", fontSize: 16 },
		toggle_text: { color: colors.subtext, fontSize: 13, textAlign: "center", paddingVertical: 8 },
		info_row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.line },
		label: { color: colors.subtext, fontSize: 14 },
		value: { color: colors.text, fontSize: 14, fontWeight: "500", maxWidth: "60%" }
	});
