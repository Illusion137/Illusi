import { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableHighlight, ScrollView, ActivityIndicator } from 'react-native';
import type { Prefs } from '@illusive/prefs';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import usePTheme from '@hooks/usePTheme';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { SyncEngine } from '@illusive/db/sync/sync_engine';
import type { AuthMe, Me } from '@origin/illusi/types';
import type { DroppedChange } from '@illusive/db/sync/push';
import { catch_log } from '@common/utils/error_util';

const STATUS_TEXT: Record<SyncEngine.Status, string> = {
	IDLE: 'Up to date',
	SYNCING: 'Syncing…',
	OFFLINE: 'Offline',
	LOGGED_OUT: 'Logged out',
	UNVERIFIED: 'Waiting for email confirmation',
	ERROR: 'Sync failed'
};

const DROPPED_KIND_TEXT: Record<string, string> = {
	user_track: 'Library track',
	playlist: 'Playlist',
	playlist_track: 'Playlist track',
	inherited_search: 'Playlist search',
	inherited_playlist: 'Inherited playlist',
	track_play: 'Play',
	recent_search: 'Recent search'
};

/** Signed out: signing in or up, or the two steps of resetting a forgotten password. Signed in: changing a credential. */
type Form = 'none' | 'forgot' | 'reset' | 'change_password' | 'change_email';

type Result = { error: Error } | object | null;
const error_of = (result: Result) => (result !== null && 'error' in result ? result.error.message : null);

export default function ExtraSyncScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [logged_in, set_logged_in] = useState(() => {
		IllusiAccount.configure();
		return IllusiAccount.is_logged_in();
	});
	const [progress, set_progress] = useState<SyncEngine.Progress>(SyncEngine.get_progress());
	const [me, set_me] = useState<Me | null>(null);
	const [account, set_account] = useState<AuthMe | null>(null);
	const [username, set_username] = useState('');
	const [email, set_email] = useState('');
	const [password, set_password] = useState('');
	const [code, set_code] = useState('');
	const [new_password, set_new_password] = useState('');
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [notice, set_notice] = useState<string | null>(null);
	const [is_signup, set_is_signup] = useState(false);
	const [form, set_form] = useState<Form>('none');
	const [dropped, set_dropped] = useState<DroppedChange[]>([]);
	const [show_dropped, set_show_dropped] = useState(false);

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
		IllusiAccount.account().then((result) => {
			if (!('error' in result)) set_account(result);
		}).catch(catch_log);
		IllusiAccount.me().then((result) => {
			if (!('error' in result)) set_me(result);
		}).catch(catch_log);
		SyncEngine.dropped().then(set_dropped).catch(catch_log);
	}, [logged_in, progress.last_synced_at, progress.status]);

	function open_form(next: Form) {
		set_form(next);
		set_error(null);
		set_notice(null);
		set_password('');
		set_new_password('');
		set_code('');
	}

	/** Runs an account call with the spinner up; true when it succeeded */
	async function run(task: () => Promise<Result>, success_notice?: string): Promise<boolean> {
		set_error(null);
		set_notice(null);
		set_loading(true);
		try {
			const message = error_of(await task());
			if (message !== null) {
				set_error(message);
				return false;
			}
			if (success_notice !== undefined) set_notice(success_notice);
			return true;
		} finally {
			set_loading(false);
		}
	}

	async function handle_submit() {
		const ok = await run(async () => (is_signup ? IllusiAccount.register({ username, email, password }) : IllusiAccount.login({ email, password })));
		if (ok) SyncEngine.sync_now().catch(catch_log);
	}

	async function handle_forgot() {
		if (await run(async () => IllusiAccount.forgot_password(email), `If ${email.trim()} has an account, a 6-digit code is on its way.`)) set_form('reset');
	}

	async function handle_reset() {
		const ok = await run(async () => IllusiAccount.reset_password({ email, code: code.trim(), password: new_password }));
		if (!ok) return;
		open_form('none');
		SyncEngine.sync_now().catch(catch_log);
	}

	async function handle_change_password() {
		if (await run(async () => IllusiAccount.change_password(password, new_password), 'Password changed. Your other devices were signed out.')) {
			set_form('none');
			set_password('');
			set_new_password('');
		}
	}

	async function handle_change_email() {
		if (await run(async () => IllusiAccount.change_email(password, email), `We sent a confirmation link to ${email.trim()}. Your email changes once you open it.`)) {
			set_form('none');
			set_password('');
		}
	}

	async function handle_resend() {
		await run(async () => IllusiAccount.resend_verification(), `We sent a new confirmation link to ${account?.email ?? 'your email'}.`);
	}

	async function handle_sign_out() {
		set_loading(true);
		await IllusiAccount.logout();
		open_form('none');
		set_account(null);
		set_loading(false);
	}

	async function handle_pick_avatar() {
		const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
		const asset = picked.canceled ? undefined : picked.assets[0];
		if (asset === undefined) return;
		const file = { uri: asset.uri, name: asset.fileName ?? 'avatar.jpg', type: asset.mimeType ?? 'image/jpeg' };
		await run(async () => {
			const result = await IllusiAccount.set_avatar(file);
			if (!('error' in result)) set_account(prev => (prev === null ? prev : { ...prev, avatar_id: result.avatar_id }));
			return result;
		});
	}

	async function handle_remove_avatar() {
		await run(async () => {
			const result = await IllusiAccount.remove_avatar();
			if (!('error' in result)) set_account(prev => (prev === null ? prev : { ...prev, avatar_id: null }));
			return result;
		});
	}

	async function handle_dismiss_dropped() {
		await SyncEngine.dismiss_dropped();
		set_dropped([]);
		set_show_dropped(false);
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

	const last_synced_str = progress.last_synced_at === null ? 'Never' : new Date(progress.last_synced_at).toLocaleString();

	if (logged_in) {
		const unverified = progress.status === 'UNVERIFIED' || account?.email_verified === false;
		return (
			<ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
				{unverified ? (
					<View style={styles.section}>
						<View style={styles.row}>
							<Ionicons name="mail-unread-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
							<Text style={styles.header_text}>Confirm Your Email</Text>
						</View>
						<View style={styles.line} />
						<Text style={styles.description}>
							{`We sent a confirmation link to ${account?.email ?? 'your email'}. Open it, then tap "I've Confirmed". Your library starts syncing once your email is confirmed.`}
						</Text>
						<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={async () => SyncEngine.sync_now()} disabled={loading} style={styles.submit_btn}>
							<View style={styles.btn_content}><Text style={styles.submit_text}>I've Confirmed</Text></View>
						</TouchableHighlight>
						<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_resend} disabled={loading}>
							<Text style={styles.toggle_text}>Resend the email</Text>
						</TouchableHighlight>
						<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={() => open_form(form === 'change_email' ? 'none' : 'change_email')} disabled={loading}>
							<Text style={styles.toggle_text}>Wrong address? Change it</Text>
						</TouchableHighlight>
					</View>
				) : null}

				<View style={styles.section}>
					<View style={styles.row}>
						<Ionicons name={unverified ? 'cloud-outline' : 'cloud-done-outline'} size={20} color={unverified ? colors.subtext : colors.green} style={{ marginRight: 8 }} />
						<Text style={styles.header_text}>Logged In</Text>
					</View>
					<View style={styles.line} />
					{unverified ? null : (
						<View style={styles.profile_row}>
							<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_pick_avatar} disabled={loading}>
								{account?.avatar_id ? (
									<Image source={IllusiAccount.avatar_source(account.avatar_id)} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
								) : (
									<View style={[styles.avatar, styles.avatar_empty]}><Ionicons name="person" size={30} color={colors.subtext} /></View>
								)}
							</TouchableHighlight>
							<View style={{ flex: 1, marginLeft: 14 }}>
								<Text style={styles.username_text} numberOfLines={1}>{account?.username ?? me?.user.username ?? ''}</Text>
								<View style={styles.row}>
									<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_pick_avatar} disabled={loading}>
										<Text style={styles.link_text}>{account?.avatar_id ? 'Change Photo' : 'Add Photo'}</Text>
									</TouchableHighlight>
									{account?.avatar_id ? (
										<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_remove_avatar} disabled={loading}>
											<Text style={[styles.link_text, { marginLeft: 16 }]}>Remove</Text>
										</TouchableHighlight>
									) : null}
								</View>
							</View>
						</View>
					)}
					<View style={styles.info_row}>
						<Text style={styles.label}>Account</Text>
						<Text style={styles.value} numberOfLines={1}>
							{account?.email ?? me?.user.email ?? '…'}
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
					)
						: null}
					{progress.status === 'ERROR' && progress.last_error ? <Text style={[styles.error_text, { marginTop: 10 }]}>{progress.last_error}</Text> : null}
				</View>

				{dropped.length > 0 ? (
					<View style={styles.section}>
						<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={() => set_show_dropped(!show_dropped)}>
							<View style={styles.row}>
								<Ionicons name="warning-outline" size={18} color={colors.red ?? '#ff4444'} style={{ marginRight: 8 }} />
								<Text style={styles.warning_text}>{`${dropped.length} change${dropped.length === 1 ? '' : 's'} couldn't be synced`}</Text>
								<Ionicons name={show_dropped ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} style={{ marginLeft: 'auto' }} />
							</View>
						</TouchableHighlight>
						{show_dropped ? (
							<View>
								{dropped.slice().reverse().map(change => (
									<View key={`${change.kind}:${change.key}:${change.at}`} style={styles.info_row}>
										<Text style={styles.label}>{DROPPED_KIND_TEXT[change.kind] ?? change.kind}</Text>
										<Text style={styles.value} numberOfLines={2}>{change.reason}</Text>
									</View>
								))}
								<Text style={[styles.description, { marginTop: 8 }]}>These stay on this device but the server wouldn't accept them, so your other devices don't have them.</Text>
								<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_dismiss_dropped}>
									<Text style={styles.toggle_text}>Dismiss</Text>
								</TouchableHighlight>
							</View>
						) : null}
					</View>
				) : null}

				{form === 'change_password' ? (
					<View style={styles.section}>
						<Text style={styles.subheader_text}>Change Password</Text>
						<TextInput style={styles.input} placeholder="Current password" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={set_password} />
						<TextInput style={styles.input} placeholder="New password (8+ characters)" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={new_password} onChangeText={set_new_password} />
						<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_change_password} disabled={loading || password.length === 0 || new_password.length < 8} style={[styles.submit_btn, (password.length === 0 || new_password.length < 8) && styles.btn_disabled]}>
							<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>Change Password</Text>}</View>
						</TouchableHighlight>
					</View>
				) : null}

				{form === 'change_email' ? (
					<View style={styles.section}>
						<Text style={styles.subheader_text}>Change Email</Text>
						<TextInput style={styles.input} placeholder="New email" placeholderTextColor={colors.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={set_email} />
						<TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={set_password} />
						<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_change_email} disabled={loading || email.length === 0 || password.length === 0} style={[styles.submit_btn, (email.length === 0 || password.length === 0) && styles.btn_disabled]}>
							<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>Send Confirmation Link</Text>}</View>
						</TouchableHighlight>
					</View>
				) : null}

				{error ? <Text style={[styles.error_text, styles.section]}>{error}</Text> : null}
				{notice ? <Text style={[styles.notice_text, styles.section]}>{notice}</Text> : null}

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={async () => SyncEngine.sync_now()} disabled={progress.status === 'SYNCING'} style={styles.sign_out_btn}>
					<View style={styles.btn_content}>{progress.status === 'SYNCING' ? <ActivityIndicator color={colors.text} /> : <Text style={styles.sign_out_text}>Sync Now</Text>}</View>
				</TouchableHighlight>

				{form === 'none' ? (
					<>
						<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={() => open_form('change_password')} style={styles.sign_out_btn}>
							<View style={styles.btn_content}><Text style={styles.sign_out_text}>Change Password</Text></View>
						</TouchableHighlight>
						{unverified ? null : (
							<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={() => open_form('change_email')} style={styles.sign_out_btn}>
								<View style={styles.btn_content}><Text style={styles.sign_out_text}>Change Email</Text></View>
							</TouchableHighlight>
						)}
					</>
				) : (
					<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={() => open_form('none')} style={styles.sign_out_btn}>
						<View style={styles.btn_content}><Text style={styles.sign_out_text}>Cancel</Text></View>
					</TouchableHighlight>
				)}

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_sign_out} disabled={loading} style={styles.sign_out_btn}>
					<View style={styles.btn_content}>{loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.sign_out_text}>Sign Out</Text>}</View>
				</TouchableHighlight>
				<View style={{ height: 100 }} />
			</ScrollView>
		);
	}

	if (form === 'forgot' || form === 'reset') {
		const can_send = email.trim().length > 0;
		const can_reset = /^\d{6}$/.test(code.trim()) && new_password.length >= 8;
		return (
			<ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
				<View style={styles.section}>
					<View style={styles.row}>
						<Ionicons name="key-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
						<Text style={styles.header_text}>Reset Password</Text>
					</View>
					<View style={styles.line} />
					<Text style={styles.description}>{form === 'forgot' ? 'Enter your account\'s email and we\'ll send you a 6-digit code.' : 'Enter the code from the email and choose a new password. Your other devices will be signed out.'}</Text>
					<TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={set_email} editable={form === 'forgot'} />
					{form === 'reset' ? (
						<>
							<TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor={colors.subtext} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={set_code} />
							<TextInput style={styles.input} placeholder="New password (8+ characters)" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={new_password} onChangeText={set_new_password} />
						</>
					) : null}

					{notice ? <Text style={styles.notice_text}>{notice}</Text> : null}
					{error ? <Text style={styles.error_text}>{error}</Text> : null}

					{form === 'forgot' ? (
						<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_forgot} disabled={loading || !can_send} style={[styles.submit_btn, !can_send && styles.btn_disabled]}>
							<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>Send Code</Text>}</View>
						</TouchableHighlight>
					) : (
						<>
							<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_reset} disabled={loading || !can_reset} style={[styles.submit_btn, !can_reset && styles.btn_disabled]}>
								<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>Set New Password</Text>}</View>
							</TouchableHighlight>
							<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={handle_forgot} disabled={loading}>
								<Text style={styles.toggle_text}>Send a new code</Text>
							</TouchableHighlight>
						</>
					)}

					<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={() => open_form('none')}>
						<Text style={styles.toggle_text}>Back to Sign In</Text>
					</TouchableHighlight>
				</View>
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
					<Text style={styles.header_text}>{is_signup ? 'Create Account' : 'Sign In'}</Text>
				</View>
				<View style={styles.line} />
				<Text style={styles.description}>{is_signup ? 'Create an account to back up your library and sync across devices.' : 'Sign in to restore your library backup or sync across devices.'}</Text>

				{is_signup ? <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.subtext} autoCapitalize="none" autoCorrect={false} value={username} onChangeText={set_username} /> : null}
				<TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={set_email} />
				<TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={set_password} />

				{error && <Text style={styles.error_text}>{error}</Text>}

				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={handle_submit} disabled={loading || !can_submit} style={[styles.submit_btn, !can_submit && styles.btn_disabled]}>
					<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submit_text}>{is_signup ? 'Create Account' : 'Sign In'}</Text>}</View>
				</TouchableHighlight>

				{is_signup ? null : (
					<TouchableHighlight activeOpacity={0.6} underlayColor="transparent" onPress={() => open_form('forgot')}>
						<Text style={styles.toggle_text}>Forgot your password?</Text>
					</TouchableHighlight>
				)}

				<TouchableHighlight
					activeOpacity={0.6}
					underlayColor="transparent"
					onPress={() => {
						set_is_signup(!is_signup);
						set_error(null);
					}}
				>
					<Text style={styles.toggle_text}>{is_signup ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}</Text>
				</TouchableHighlight>
			</View>
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		container: { backgroundColor: colors.background, flex: 1, width: '100%' },
		section: { marginTop: 20, marginHorizontal: 14 },
		row: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
		header_text: { color: colors.primary, fontWeight: '500', fontSize: 20 },
		subheader_text: { color: colors.text, fontWeight: '500', fontSize: 16, marginBottom: 12 },
		line: { width: '100%', height: 1, backgroundColor: colors.line, marginBottom: 14 },
		description: { color: colors.subtext, fontSize: 13, marginBottom: 16, lineHeight: 18 },
		input: { backgroundColor: colors.shelf, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
		error_text: { color: colors.red ?? '#ff4444', fontSize: 13, marginBottom: 10 },
		notice_text: { color: colors.subtext, fontSize: 13, marginBottom: 10, lineHeight: 18 },
		warning_text: { color: colors.text, fontSize: 14, fontWeight: '500' },
		submit_btn: { backgroundColor: colors.primary, borderRadius: 10, marginBottom: 12 },
		sign_out_btn: { backgroundColor: colors.shelf, borderRadius: 10, marginHorizontal: 14, marginTop: 12 },
		btn_disabled: { opacity: 0.4 },
		btn_content: { paddingVertical: 14, alignItems: 'center' },
		submit_text: { color: '#fff', fontWeight: '600', fontSize: 16 },
		sign_out_text: { color: colors.text, fontWeight: '500', fontSize: 16 },
		toggle_text: { color: colors.subtext, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
		info_row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.line },
		label: { color: colors.subtext, fontSize: 14 },
		value: { color: colors.text, fontSize: 14, fontWeight: '500', maxWidth: '60%' },
		profile_row: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
		avatar: { width: 64, height: 64, borderRadius: 32 },
		avatar_empty: { backgroundColor: colors.shelf, alignItems: 'center', justifyContent: 'center' },
		username_text: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 4 },
		link_text: { color: colors.primary, fontSize: 14, paddingVertical: 4 }
	});
