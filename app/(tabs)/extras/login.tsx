import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import type { Prefs } from '@illusive/prefs';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { SyncEngine } from '@illusive/db/sync/sync_engine';
import { SQLArtists } from '@illusive/sql/sql_artists';
import { catch_log } from '@common/utils/error_util';
import usePTheme from '@hooks/usePTheme';
import useIllusiAccount, { refresh_illusi_account } from '@hooks/useIllusiAccount';

type Step = 'sign_in' | 'sign_up' | 'forgot' | 'reset' | 'verify' | 'change_email' | 'confirmed';

type Result = { error: Error } | object | null;
const error_of = (result: Result) => (result !== null && 'error' in result ? result.error.message : null);

const VERIFY_POLL_MS = 5000;
const CONFIRMED_CLOSE_MS = 1200;

const STEP_TEXT: Record<Step, { title: string; subtitle: string }> = {
	sign_in: { title: 'Welcome Back', subtitle: 'Sign in to restore your library and sync across your devices.' },
	sign_up: { title: 'Create Account', subtitle: 'Back up your library, playlists and plays, and pick up on any device.' },
	forgot: { title: 'Reset Password', subtitle: 'Enter your account\'s email and we\'ll send you a 6-digit code.' },
	reset: { title: 'Enter Your Code', subtitle: 'Use the code from the email and choose a new password. Your other devices will be signed out.' },
	verify: { title: 'Confirm Your Email', subtitle: '' },
	change_email: { title: 'Change Email', subtitle: 'We\'ll send a new confirmation link to this address.' },
	confirmed: { title: 'You\'re All Set', subtitle: 'Your email is confirmed. Your library is syncing now.' }
};

function close() {
	if (router.canGoBack()) router.back();
}

export default function LoginSheet() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { logged_in, account, unverified } = useIllusiAccount();

	const [step, set_step] = useState<Step>(() => (logged_in ? 'verify' : 'sign_in'));
	const [username, set_username] = useState('');
	const [email, set_email] = useState('');
	const [password, set_password] = useState('');
	const [code, set_code] = useState('');
	const [new_password, set_new_password] = useState('');
	const [loading, set_loading] = useState(false);
	const [error, set_error] = useState<string | null>(null);
	const [notice, set_notice] = useState<string | null>(null);
	const finished = useRef(false);

	function go(next: Step) {
		set_step(next);
		set_error(null);
		set_notice(null);
		set_code('');
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

	function finish() {
		if (finished.current) return;
		finished.current = true;
		SyncEngine.sync_now().catch(catch_log);
		set_step('confirmed');
		setTimeout(close, CONFIRMED_CLOSE_MS);
	}

	/** After signing in, signing up or resetting: done, unless the email still needs confirming */
	async function after_sign_in() {
		const current = await refresh_illusi_account();
		if (current?.email_verified === false || IllusiAccount.is_email_verified() === false) go('verify');
		else finish();
	}

	async function check_verified(): Promise<boolean> {
		const current = await refresh_illusi_account();
		if (current?.email_verified !== true) return false;
		finish();
		return true;
	}

	// Opened while signed in and already confirmed (e.g. confirmed from another device): nothing to do
	useEffect(() => {
		if (logged_in && account !== null && !unverified && step === 'verify') finish();
	}, [logged_in, account, unverified]);

	// Signed out elsewhere while the sheet is open
	useEffect(() => {
		if (!logged_in && (step === 'verify' || step === 'change_email')) go('sign_in');
	}, [logged_in]);

	// Notice the link being opened in the browser, without the user having to come back and tap
	useEffect(() => {
		if (step !== 'verify') return;
		const interval = setInterval(() => {
			check_verified().catch(catch_log);
		}, VERIFY_POLL_MS);
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') check_verified().catch(catch_log);
		});
		return () => {
			clearInterval(interval);
			subscription.remove();
		};
	}, [step]);

	async function handle_sign_in() {
		if (await run(async () => IllusiAccount.login({ email, password }))) await after_sign_in();
	}
	async function handle_sign_up() {
		if (await run(async () => IllusiAccount.register({ username: username.trim(), email, password }))) await after_sign_in();
	}
	async function handle_forgot() {
		if (await run(async () => IllusiAccount.forgot_password(email), `If ${email.trim()} has an account, a code is on its way.`)) set_step('reset');
	}
	async function handle_reset() {
		if (await run(async () => IllusiAccount.reset_password({ email, code: code.trim(), password: new_password }))) await after_sign_in();
	}
	async function handle_confirmed() {
		set_loading(true);
		const verified = await check_verified().finally(() => set_loading(false));
		if (!verified) set_error('Not confirmed yet. Open the link in the email, then try again.');
	}
	async function handle_resend() {
		await run(async () => IllusiAccount.resend_verification(), `We sent a new link to ${account?.email ?? 'your email'}.`);
	}
	async function handle_change_email() {
		const ok = await run(async () => IllusiAccount.change_email(password, email));
		if (!ok) return;
		await refresh_illusi_account();
		go('verify');
		set_notice(`We sent a confirmation link to ${email.trim()}.`);
	}
	async function handle_switch_account() {
		set_loading(true);
		await IllusiAccount.logout().finally(() => set_loading(false));
		set_password('');
		go('sign_in');
	}

	const text = STEP_TEXT[step];
	const subtitle = step === 'verify'
		? `We sent a link to ${account?.email ?? 'your email'}. Open it on any device and this will continue on its own.`
		: text.subtitle;

	function input(props: React.ComponentProps<typeof TextInput>) {
		return <TextInput style={styles.input} placeholderTextColor={colors.subtext} autoCapitalize="none" autoCorrect={false} editable={!loading} {...props} />;
	}
	function primary(label: string, on_press: () => void, enabled = true) {
		return (
			<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={on_press} disabled={loading || !enabled} style={[styles.primary_btn, !enabled && styles.disabled]}>
				<View style={styles.btn_content}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primary_text}>{label}</Text>}</View>
			</TouchableHighlight>
		);
	}
	function link(label: string, on_press: () => void) {
		return (
			<TouchableOpacity onPress={on_press} disabled={loading} style={styles.link}>
				<Text style={styles.link_text}>{label}</Text>
			</TouchableOpacity>
		);
	}

	const valid_email = /\S+@\S+\.\S+/.test(email.trim());

	return (
		<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<View style={styles.grabber} />
			<TouchableOpacity onPress={close} style={styles.close} hitSlop={12}>
				<Ionicons name="close" size={22} color={colors.subtext} />
			</TouchableOpacity>
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<View style={styles.hero}>
					{step === 'verify' || step === 'change_email' ? (
						<View style={[styles.hero_icon, { backgroundColor: colors.shelf }]}><Ionicons name="mail-unread-outline" size={40} color={colors.primary} /></View>
					) : step === 'confirmed'
						? (
								<View style={[styles.hero_icon, { backgroundColor: colors.shelf }]}><Ionicons name="checkmark-circle" size={48} color={colors.green} /></View>
							)
						: step === 'forgot' || step === 'reset'
							? (
									<View style={[styles.hero_icon, { backgroundColor: colors.shelf }]}><Ionicons name="key-outline" size={40} color={colors.primary} /></View>
								)
							: (
									<Image source={SQLArtists.default_profile_picture_url} style={styles.hero_avatar} contentFit="cover" cachePolicy="disk" />
								)}
					<Text style={styles.title}>{text.title}</Text>
					{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
				</View>

				{step === 'sign_in' || step === 'sign_up' ? (
					<View style={styles.segment}>
						{(['sign_in', 'sign_up'] as const).map(option => (
							<TouchableOpacity key={option} onPress={() => go(option)} style={[styles.segment_item, step === option && styles.segment_active]}>
								<Text style={[styles.segment_text, step === option && styles.segment_text_active]}>{option === 'sign_in' ? 'Sign In' : 'Sign Up'}</Text>
							</TouchableOpacity>
						))}
					</View>
				) : null}

				{step === 'sign_up' ? input({ placeholder: 'Username', value: username, onChangeText: set_username, textContentType: 'username', maxLength: 64 }) : null}
				{step === 'sign_in' || step === 'sign_up' || step === 'forgot' || step === 'reset' || step === 'change_email'
					? input({ placeholder: step === 'change_email' ? 'New email' : 'Email', value: email, onChangeText: set_email, keyboardType: 'email-address', textContentType: 'emailAddress', autoComplete: 'email', editable: !loading && step !== 'reset' })
					: null}
				{step === 'sign_in' || step === 'sign_up' || step === 'change_email'
					? input({ placeholder: step === 'sign_up' ? 'Password (8+ characters)' : 'Password', value: password, onChangeText: set_password, secureTextEntry: true, textContentType: step === 'sign_up' ? 'newPassword' : 'password' })
					: null}
				{step === 'reset' ? (
					<>
						{input({ placeholder: '6-digit code', value: code, onChangeText: set_code, keyboardType: 'number-pad', maxLength: 6, textContentType: 'oneTimeCode', autoComplete: 'one-time-code' })}
						{input({ placeholder: 'New password (8+ characters)', value: new_password, onChangeText: set_new_password, secureTextEntry: true, textContentType: 'newPassword' })}
					</>
				) : null}

				{error ? (
					<View style={styles.message_row}>
						<Ionicons name="alert-circle" size={16} color={colors.red} />
						<Text style={[styles.message, { color: colors.red }]}>{error}</Text>
					</View>
				) : null}
				{notice ? (
					<View style={styles.message_row}>
						<Ionicons name="information-circle" size={16} color={colors.subtext} />
						<Text style={styles.message}>{notice}</Text>
					</View>
				) : null}

				{step === 'sign_in' ? (
					<>
						{primary('Sign In', handle_sign_in, valid_email && password.length > 0)}
						{link('Forgot your password?', () => go('forgot'))}
					</>
				) : null}
				{step === 'sign_up' ? primary('Create Account', handle_sign_up, username.trim().length > 0 && valid_email && password.length >= 8) : null}
				{step === 'forgot' ? (
					<>
						{primary('Send Code', handle_forgot, valid_email)}
						{link('Back to Sign In', () => go('sign_in'))}
					</>
				) : null}
				{step === 'reset' ? (
					<>
						{primary('Set New Password', handle_reset, /^\d{6}$/.test(code.trim()) && new_password.length >= 8)}
						{link('Send a new code', handle_forgot)}
						{link('Back to Sign In', () => go('sign_in'))}
					</>
				) : null}
				{step === 'verify' ? (
					<>
						<View style={styles.waiting}>
							<ActivityIndicator color={colors.subtext} size="small" />
							<Text style={styles.waiting_text}>Waiting for confirmation…</Text>
						</View>
						{primary('I\'ve Confirmed', handle_confirmed)}
						{link('Resend the email', handle_resend)}
						{link('Wrong address? Change it', () => {
							set_email('');
							go('change_email');
						})}
						{link('Use a different account', handle_switch_account)}
					</>
				) : null}
				{step === 'change_email' ? (
					<>
						{primary('Send Confirmation Link', handle_change_email, valid_email && password.length > 0)}
						{link('Back', () => go('verify'))}
					</>
				) : null}
				{step === 'confirmed' ? primary('Done', close) : null}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: colors.background },
		grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 8 },
		close: { position: 'absolute', top: 16, right: 16, zIndex: 1, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.shelf, alignItems: 'center', justifyContent: 'center' },
		content: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 60 },
		hero: { alignItems: 'center', marginBottom: 24 },
		hero_avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.shelf, marginBottom: 16 },
		hero_icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
		title: { color: colors.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },
		subtitle: { color: colors.subtext, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
		segment: { flexDirection: 'row', backgroundColor: colors.shelf, borderRadius: 10, padding: 3, marginBottom: 18 },
		segment_item: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
		segment_active: { backgroundColor: colors.background },
		segment_text: { color: colors.subtext, fontSize: 15, fontWeight: '500' },
		segment_text_active: { color: colors.text, fontWeight: '600' },
		input: { backgroundColor: colors.shelf, color: colors.text, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
		message_row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 6 },
		message: { color: colors.subtext, fontSize: 14, lineHeight: 19, flex: 1 },
		primary_btn: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 4, marginBottom: 6 },
		disabled: { opacity: 0.4 },
		btn_content: { paddingVertical: 15, alignItems: 'center' },
		primary_text: { color: '#fff', fontWeight: '600', fontSize: 17 },
		link: { paddingVertical: 10, alignItems: 'center' },
		link_text: { color: colors.primary, fontSize: 15 },
		waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
		waiting_text: { color: colors.subtext, fontSize: 14 }
	});
