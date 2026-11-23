import { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableHighlight, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert } from 'react-native';
import type { Prefs } from '@illusive/prefs';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import usePTheme from '@hooks/usePTheme';
import useIllusiAccount, { refresh_illusi_account, update_illusi_account } from '@hooks/useIllusiAccount';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { SyncEngine } from '@illusive/db/sync/sync_engine';
import { SQLArtists } from '@illusive/sql/sql_artists';
import type { Me } from '@origin/illusi/types';
import type { DroppedChange } from '@illusive/db/sync/push';
import { catch_log } from '@common/utils/error_util';
import { SYNC_STATUS_TEXT, sync_status_color } from '@utils/sync_status';

const DROPPED_KIND_TEXT: Record<string, string> = {
	user_track: 'Library track',
	playlist: 'Playlist',
	playlist_track: 'Playlist track',
	inherited_search: 'Playlist search',
	inherited_playlist: 'Inherited playlist',
	track_play: 'Play',
	recent_search: 'Recent search'
};

type Form = 'none' | 'change_password' | 'change_email';

type Result = { error: Error } | object | null;
const error_of = (result: Result) => (result !== null && 'error' in result ? result.error.message : null);

function relative_time(at: number | null): string {
	if (at === null) return 'Never';
	const seconds = Math.round((Date.now() - at) / 1000);
	if (seconds < 60) return 'Just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
	if (seconds < 86_400) return `${Math.floor(seconds / 3600)} hr ago`;
	return new Date(at).toLocaleDateString();
}

export default function ExtraSyncScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { logged_in, account, progress, unverified } = useIllusiAccount();

	const [me, set_me] = useState<Me | null>(null);
	const [email, set_email] = useState('');
	const [password, set_password] = useState('');
	const [new_password, set_new_password] = useState('');
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [notice, set_notice] = useState<string | null>(null);
	const [form, set_form] = useState<Form>('none');
	const [dropped, set_dropped] = useState<DroppedChange[]>([]);
	const [show_dropped, set_show_dropped] = useState(false);

	useEffect(() => {
		if (!logged_in) {
			set_me(null);
			return;
		}
		IllusiAccount.me().then((result) => {
			if (!('error' in result)) set_me(result);
		}).catch(catch_log);
		SyncEngine.dropped().then(set_dropped).catch(catch_log);
	}, [logged_in, progress.last_synced_at, progress.status]);

	function open_form(next: Form) {
		set_form(prev => (prev === next ? 'none' : next));
		set_error(null);
		set_notice(null);
		set_email('');
		set_password('');
		set_new_password('');
	}

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

	async function handle_change_password() {
		if (await run(async () => IllusiAccount.change_password(password, new_password), 'Password changed. Your other devices were signed out.')) set_form('none');
	}
	async function handle_change_email() {
		const target = email.trim();
		if (!await run(async () => IllusiAccount.change_email(password, email), `We sent a confirmation link to ${target}. Your email changes once you open it.`)) return;
		set_form('none');
		refresh_illusi_account().catch(catch_log);
	}

	function handle_sign_out() {
		Alert.alert('Sign Out', 'Your library stays on this device. It stops syncing until you sign in again.', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					set_loading(true);
					await IllusiAccount.logout().finally(() => set_loading(false));
					set_form('none');
				}
			}
		]);
	}

	async function pick_avatar() {
		const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
		const asset = picked.canceled ? undefined : picked.assets[0];
		if (asset === undefined) return;
		const file = { uri: asset.uri, name: asset.fileName ?? 'avatar.jpg', type: asset.mimeType ?? 'image/jpeg' };
		await run(async () => {
			const result = await IllusiAccount.set_avatar(file);
			if (!('error' in result)) update_illusi_account({ avatar_id: result.avatar_id });
			return result;
		});
	}
	async function remove_avatar() {
		await run(async () => {
			const result = await IllusiAccount.remove_avatar();
			if (!('error' in result)) update_illusi_account({ avatar_id: null });
			return result;
		});
	}
	function handle_avatar() {
		if (!account?.avatar_id) {
			pick_avatar().catch(catch_log);
			return;
		}
		Alert.alert('Profile Photo', undefined, [
			{ text: 'Choose New Photo', onPress: () => void pick_avatar().catch(catch_log) },
			{ text: 'Remove Photo', style: 'destructive', onPress: () => void remove_avatar().catch(catch_log) },
			{ text: 'Cancel', style: 'cancel' }
		]);
	}

	async function handle_public_imports(public_imports: boolean) {
		update_illusi_account({ public_imports });
		const result = await IllusiAccount.set_public_imports(public_imports);
		if ('error' in result) {
			update_illusi_account({ public_imports: !public_imports });
			set_error(result.error.message);
		}
	}

	async function handle_dismiss_dropped() {
		await SyncEngine.dismiss_dropped();
		set_dropped([]);
		set_show_dropped(false);
	}

	if (!IllusiAccount.has_server()) {
		return (
			<View style={[styles.container, styles.empty]}>
				<Ionicons name="cloud-offline-outline" size={56} color={colors.subtext} />
				<Text style={styles.empty_title}>Sync Unavailable</Text>
				<Text style={styles.empty_text}>No Illusi server is configured.</Text>
			</View>
		);
	}

	if (!logged_in) {
		return (
			<View style={[styles.container, styles.empty]}>
				<Image source={SQLArtists.default_profile_picture_url} style={styles.empty_avatar} contentFit="cover" cachePolicy="disk" />
				<Text style={styles.empty_title}>Not Signed In</Text>
				<Text style={styles.empty_text}>Sign in to back up your library, playlists and plays, and sync them across your devices.</Text>
				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={() => router.navigate('/extras/login')} style={[styles.primary_btn, { alignSelf: 'stretch', marginHorizontal: 32 }]}>
					<View style={styles.btn_content}><Text style={styles.primary_text}>Log In</Text></View>
				</TouchableHighlight>
			</View>
		);
	}

	const status_color = sync_status_color(progress.status, colors);
	const syncing = progress.status === 'SYNCING';

	function row(icon: keyof typeof Ionicons.glyphMap, label: string, on_press: () => void, opts: { destructive?: boolean; open?: boolean; last?: boolean } = {}) {
		const tint = opts.destructive ? colors.red : colors.text;
		return (
			<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={on_press} disabled={loading}>
				<View style={[styles.row, !opts.last && styles.row_divider]}>
					<Ionicons name={icon} size={20} color={opts.destructive ? colors.red : colors.primary} style={styles.row_icon} />
					<Text style={[styles.row_label, { color: tint }]}>{label}</Text>
					{opts.destructive ? null : <Ionicons name={opts.open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.subtext} />}
				</View>
			</TouchableHighlight>
		);
	}
	function input(props: React.ComponentProps<typeof TextInput>) {
		return <TextInput style={styles.input} placeholderTextColor={colors.subtext} autoCapitalize="none" autoCorrect={false} editable={!loading} {...props} />;
	}
	function submit(label: string, on_press: () => void, enabled: boolean) {
		return (
			<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={on_press} disabled={loading || !enabled} style={[styles.primary_btn, !enabled && styles.disabled]}>
				<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primary_text}>{label}</Text>}</View>
			</TouchableHighlight>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			<View style={styles.profile}>
				<TouchableOpacity onPress={handle_avatar} disabled={loading || unverified} activeOpacity={0.7}>
					<Image source={account?.avatar_id ? IllusiAccount.avatar_source(account.avatar_id) : SQLArtists.default_profile_picture_url} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
					{unverified ? null : (
						<View style={styles.avatar_badge}>
							<Ionicons name="camera" size={14} color="#fff" />
						</View>
					)}
				</TouchableOpacity>
				<Text style={styles.username} numberOfLines={1}>{account?.username ?? me?.user.username ?? '…'}</Text>
				<Text style={styles.email} numberOfLines={1}>{account?.email ?? me?.user.email ?? ''}</Text>
			</View>

			{unverified ? (
				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={() => router.navigate('/extras/login')} style={styles.banner}>
					<View style={styles.banner_inner}>
						<Ionicons name="mail-unread-outline" size={22} color={colors.orange} />
						<View style={{ flex: 1, marginHorizontal: 12 }}>
							<Text style={styles.banner_title}>Confirm your email</Text>
							<Text style={styles.banner_text}>Your library starts syncing once you open the link we sent.</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color={colors.subtext} />
					</View>
				</TouchableHighlight>
			) : null}

			<Text style={styles.section_title}>Sync</Text>
			<View style={styles.card}>
				<View style={styles.status}>
					<View style={[styles.status_dot, { backgroundColor: status_color }]} />
					<Text style={styles.status_text}>{SYNC_STATUS_TEXT[progress.status]}</Text>
					{syncing ? <ActivityIndicator size="small" color={colors.subtext} style={{ marginLeft: 'auto' }} /> : null}
				</View>
				<View style={styles.detail}>
					<Text style={styles.detail_label}>Last synced</Text>
					<Text style={styles.detail_value}>{relative_time(progress.last_synced_at)}</Text>
				</View>
				<View style={[styles.detail, styles.detail_last]}>
					<Text style={styles.detail_label}>Waiting to upload</Text>
					<Text style={styles.detail_value}>{progress.pending === 0 ? 'Nothing' : `${progress.pending} change${progress.pending === 1 ? '' : 's'}`}</Text>
				</View>
				{progress.status === 'ERROR' && progress.last_error ? <Text style={styles.card_error}>{progress.last_error}</Text> : null}
				<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={async () => SyncEngine.sync_now()} disabled={syncing || unverified} style={[styles.sync_btn, (syncing || unverified) && styles.disabled]}>
					<View style={styles.btn_content_small}>
						<Ionicons name="sync" size={16} color={colors.primary} style={{ marginRight: 6 }} />
						<Text style={styles.sync_btn_text}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
					</View>
				</TouchableHighlight>
			</View>

			{dropped.length > 0 ? (
				<View style={[styles.card, { marginTop: 12 }]}>
					<TouchableOpacity onPress={() => set_show_dropped(!show_dropped)} style={styles.status}>
						<Ionicons name="warning" size={18} color={colors.orange} style={{ marginRight: 8 }} />
						<Text style={styles.status_text}>{`${dropped.length} change${dropped.length === 1 ? '' : 's'} couldn't sync`}</Text>
						<Ionicons name={show_dropped ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} style={{ marginLeft: 'auto' }} />
					</TouchableOpacity>
					{show_dropped ? (
						<>
							{dropped.slice().reverse().map(change => (
								<View key={`${change.kind}:${change.key}:${change.at}`} style={styles.detail}>
									<Text style={styles.detail_label}>{DROPPED_KIND_TEXT[change.kind] ?? change.kind}</Text>
									<Text style={[styles.detail_value, { maxWidth: '60%' }]} numberOfLines={2}>{change.reason}</Text>
								</View>
							))}
							<Text style={styles.footnote}>These stay on this device, but the server wouldn't accept them, so your other devices don't have them.</Text>
							<TouchableOpacity onPress={handle_dismiss_dropped} style={{ paddingVertical: 10, alignItems: 'center' }}>
								<Text style={{ color: colors.primary, fontSize: 15 }}>Dismiss</Text>
							</TouchableOpacity>
						</>
					) : null}
				</View>
			) : null}

			{account && !unverified ? (
				<>
					<Text style={styles.section_title}>Privacy</Text>
					<View style={styles.card}>
						<View style={styles.switch_row}>
							<Ionicons name="globe-outline" size={20} color={colors.primary} style={styles.row_icon} />
							<Text style={styles.row_label}>Public Imports</Text>
							<Switch value={account.public_imports} onValueChange={handle_public_imports} trackColor={{ true: colors.primary }} />
						</View>
					</View>
					<Text style={styles.section_footer}>Let anyone on Illusi see and play the songs you've imported on your profile. Your public playlists show there either way.</Text>
				</>
			) : null}

			<Text style={styles.section_title}>Account</Text>
			<View style={styles.card_list}>
				{unverified ? null : row('mail-outline', 'Change Email', () => open_form('change_email'), { open: form === 'change_email' })}
				{form === 'change_email' ? (
					<View style={styles.form}>
						{input({ placeholder: 'New email', value: email, onChangeText: set_email, keyboardType: 'email-address', textContentType: 'emailAddress' })}
						{input({ placeholder: 'Password', value: password, onChangeText: set_password, secureTextEntry: true, textContentType: 'password' })}
						{submit('Send Confirmation Link', handle_change_email, /\S+@\S+\.\S+/.test(email.trim()) && password.length > 0)}
					</View>
				) : null}
				{row('key-outline', 'Change Password', () => open_form('change_password'), { open: form === 'change_password' })}
				{form === 'change_password' ? (
					<View style={styles.form}>
						{input({ placeholder: 'Current password', value: password, onChangeText: set_password, secureTextEntry: true, textContentType: 'password' })}
						{input({ placeholder: 'New password (8+ characters)', value: new_password, onChangeText: set_new_password, secureTextEntry: true, textContentType: 'newPassword' })}
						{submit('Change Password', handle_change_password, password.length > 0 && new_password.length >= 8)}
					</View>
				) : null}
				{row('log-out-outline', 'Sign Out', handle_sign_out, { destructive: true, last: true })}
			</View>

			{error ? (
				<View style={styles.message_row}>
					<Ionicons name="alert-circle" size={16} color={colors.red} />
					<Text style={[styles.message, { color: colors.red }]}>{error}</Text>
				</View>
			) : null}
			{notice ? (
				<View style={styles.message_row}>
					<Ionicons name="checkmark-circle" size={16} color={colors.green} />
					<Text style={styles.message}>{notice}</Text>
				</View>
			) : null}
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		container: { backgroundColor: colors.background, flex: 1, width: '100%' },
		content: { paddingHorizontal: 16, paddingBottom: 120 },
		empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
		empty_avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.shelf },
		empty_title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 16 },
		empty_text: { color: colors.subtext, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 24 },
		profile: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
		avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.shelf },
		avatar_badge: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background },
		username: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 12 },
		email: { color: colors.subtext, fontSize: 15, marginTop: 2 },
		banner: { borderRadius: 14, backgroundColor: colors.shelf, marginBottom: 16, overflow: 'hidden' },
		banner_inner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderLeftWidth: 4, borderLeftColor: colors.orange },
		banner_title: { color: colors.text, fontSize: 16, fontWeight: '600' },
		banner_text: { color: colors.subtext, fontSize: 13, lineHeight: 18, marginTop: 2 },
		stats: { flexDirection: 'row', gap: 10 },
		stat: { flex: 1, backgroundColor: colors.shelf, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
		stat_value: { color: colors.text, fontSize: 20, fontWeight: '700' },
		stat_label: { color: colors.subtext, fontSize: 12, marginTop: 2 },
		section_title: { color: colors.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 26, marginBottom: 8, marginLeft: 4 },
		section_footer: { color: colors.subtext, fontSize: 13, lineHeight: 18, marginTop: 8, marginHorizontal: 4 },
		card: { backgroundColor: colors.shelf, borderRadius: 14, padding: 14 },
		card_list: { backgroundColor: colors.shelf, borderRadius: 14, overflow: 'hidden' },
		card_error: { color: colors.red, fontSize: 13, marginTop: 10, lineHeight: 18 },
		status: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
		status_dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
		status_text: { color: colors.text, fontSize: 16, fontWeight: '600' },
		detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
		detail_last: { paddingBottom: 4 },
		detail_label: { color: colors.subtext, fontSize: 15 },
		detail_value: { color: colors.text, fontSize: 15, fontWeight: '500', textAlign: 'right' },
		footnote: { color: colors.subtext, fontSize: 13, lineHeight: 18, marginTop: 10 },
		sync_btn: { marginTop: 12, borderRadius: 10, backgroundColor: colors.background },
		btn_content_small: { flexDirection: 'row', paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
		sync_btn_text: { color: colors.primary, fontWeight: '600', fontSize: 15 },
		switch_row: { flexDirection: 'row', alignItems: 'center' },
		row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
		row_divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
		row_icon: { marginRight: 12 },
		row_label: { flex: 1, color: colors.text, fontSize: 16 },
		form: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
		input: { backgroundColor: colors.background, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 10 },
		primary_btn: { backgroundColor: colors.primary, borderRadius: 12, marginBottom: 10 },
		disabled: { opacity: 0.4 },
		btn_content: { paddingVertical: 14, alignItems: 'center' },
		primary_text: { color: '#fff', fontWeight: '600', fontSize: 16 },
		message_row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 14, marginHorizontal: 4 },
		message: { color: colors.subtext, fontSize: 14, lineHeight: 19, flex: 1 }
	});
