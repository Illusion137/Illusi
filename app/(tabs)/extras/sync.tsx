/* eslint-disable @typescript-eslint/no-shadow */
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TextInput, TouchableHighlight, ScrollView, ActivityIndicator } from "react-native";
import { Prefs } from "@illusive/prefs";
import { supabase } from "@illusive/db/supabase";
import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import usePTheme from "@hooks/usePTheme";

export default function ExtraSyncScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [session, set_session] = useState<Session | null>(null);
	const [email, set_email] = useState("");
	const [passkey, set_passkey] = useState("");
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [is_signup, set_is_signup] = useState(false);
	const [last_synced] = useState(() => Prefs.get_pref("last_synced"));

	useEffect(() => {
		supabase()
			.auth.getSession()
			.then(({ data: { session } }) => set_session(session));
		const {
			data: { subscription }
		} = supabase().auth.onAuthStateChange((_event, session) => {
			set_session(session);
		});
		return () => subscription.unsubscribe();
	}, []);

	async function handle_submit() {
		set_error(null);
		set_loading(true);
		try {
			if (is_signup) {
				const { error } = await supabase().auth.signUp({ email, password: passkey });
				if (error) set_error(error.message);
			} else {
				const { error } = await supabase().auth.signInWithPassword({ email, password: passkey });
				if (error) set_error(error.message);
			}
		} finally {
			set_loading(false);
		}
	}

	async function handle_sign_out() {
		set_loading(true);
		await supabase().auth.signOut();
		set_loading(false);
	}

	const last_synced_str = last_synced.getTime() === 0 ? "Never" : last_synced.toLocaleString();

	if (session) {
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
							{session.user.email}
						</Text>
					</View>
					<View style={styles.info_row}>
						<Text style={styles.label}>Last Synced</Text>
						<Text style={styles.value}>{last_synced_str}</Text>
					</View>
				</View>

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_sign_out} disabled={loading} style={styles.sign_out_btn}>
					<View style={styles.btn_content}>{loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.sign_out_text}>Sign Out</Text>}</View>
				</TouchableHighlight>

				<View style={styles.section}>
					<Text style={styles.header_text}>Recovery Code</Text>
					<View style={styles.line} />
					<View style={styles.uuid_container}>
						{Prefs.get_pref("user_uuid")
							.split("-")
							.map((part, i) => (
								<Text key={i} style={styles.uuid_text}>
									{part}
								</Text>
							))}
					</View>
				</View>
				<View style={{ height: 100 }} />
			</ScrollView>
		);
	}

	return (
		<ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
			<View style={styles.section}>
				<View style={styles.row}>
					<Ionicons name="cloud-offline-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
					<Text style={styles.header_text}>{is_signup ? "Create Account" : "Sign In"}</Text>
				</View>
				<View style={styles.line} />
				<Text style={styles.description}>{is_signup ? "Create an account to back up your library and sync across devices." : "Sign in to restore your library backup or sync across devices."}</Text>

				<TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={set_email} />
				<TextInput style={styles.input} placeholder="Passkey" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={passkey} onChangeText={set_passkey} />

				{error && <Text style={styles.error_text}>{error}</Text>}

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_submit} disabled={loading || !email || !passkey} style={[styles.submit_btn, (!email || !passkey) && styles.btn_disabled]}>
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

			<View style={styles.section}>
				<Text style={styles.header_text}>Recovery Code</Text>
				<View style={styles.line} />
				<View style={styles.uuid_container}>
					{Prefs.get_pref("user_uuid")
						.split("-")
						.map((part, i) => (
							<Text key={i} style={styles.uuid_text}>
								{part}
							</Text>
						))}
				</View>
			</View>
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		container: {
			backgroundColor: colors.background,
			flex: 1,
			width: "100%"
		},
		section: {
			marginTop: 20,
			marginHorizontal: 14
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingBottom: 8
		},
		header_text: {
			color: colors.primary,
			fontWeight: "500",
			fontSize: 20
		},
		line: {
			width: "100%",
			height: 1,
			backgroundColor: colors.line,
			marginBottom: 14
		},
		description: {
			color: colors.subtext,
			fontSize: 13,
			marginBottom: 16,
			lineHeight: 18
		},
		input: {
			backgroundColor: colors.shelf,
			color: colors.text,
			borderRadius: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 16,
			marginBottom: 12
		},
		error_text: {
			color: colors.red ?? "#ff4444",
			fontSize: 13,
			marginBottom: 10
		},
		submit_btn: {
			backgroundColor: colors.primary,
			borderRadius: 10,
			marginBottom: 12
		},
		sign_out_btn: {
			backgroundColor: colors.shelf,
			borderRadius: 10,
			marginHorizontal: 14,
			marginTop: 12
		},
		btn_disabled: {
			opacity: 0.4
		},
		btn_content: {
			paddingVertical: 14,
			alignItems: "center"
		},
		submit_text: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 16
		},
		sign_out_text: {
			color: colors.text,
			fontWeight: "500",
			fontSize: 16
		},
		toggle_text: {
			color: colors.subtext,
			fontSize: 13,
			textAlign: "center",
			paddingVertical: 8
		},
		info_row: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
			borderBottomWidth: 0.5,
			borderBottomColor: colors.line
		},
		label: {
			color: colors.subtext,
			fontSize: 14
		},
		value: {
			color: colors.text,
			fontSize: 14,
			fontWeight: "500",
			maxWidth: "60%"
		},
		uuid_container: {
			paddingVertical: 16,
			alignItems: "center",
			backgroundColor: colors.shelf,
			borderRadius: 10,
			gap: 4
		},
		uuid_text: {
			color: colors.text,
			fontWeight: "bold",
			fontSize: 20,
			letterSpacing: 2
		}
	});
