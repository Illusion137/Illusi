import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import type { Prefs } from '@illusive/prefs';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { SQLArtists } from '@illusive/sql/sql_artists';
import usePTheme from '@hooks/usePTheme';
import useIllusiAccount from '@hooks/useIllusiAccount';
import { SYNC_STATUS_TEXT, sync_status_color } from '@utils/sync_status';

/** The Extras entry to the account: "Log In" opens the login sheet, a signed-in account opens the sync page */
export default function AccountButton() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { logged_in, account, progress, unverified } = useIllusiAccount();

	if (!IllusiAccount.has_server()) return null;

	function on_press() {
		router.navigate(logged_in && !unverified ? '/extras/sync' : '/extras/login');
	}

	const subtitle = !logged_in
		? 'Back up your library and sync your devices'
		: unverified ? 'Confirm your email to start syncing' : SYNC_STATUS_TEXT[progress.status];
	const dot = logged_in ? (unverified ? colors.orange : sync_status_color(progress.status, colors)) : null;

	return (
		<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={on_press}>
			<View style={styles.container}>
				<Image
					source={logged_in && account?.avatar_id ? IllusiAccount.avatar_source(account.avatar_id) : SQLArtists.default_profile_picture_url}
					style={styles.avatar}
					contentFit="cover"
					cachePolicy="disk"
				/>
				<View style={styles.texts}>
					<Text style={styles.title} numberOfLines={1}>{logged_in ? (account?.username ?? '…') : 'Log In'}</Text>
					<View style={styles.subtitle_row}>
						{dot !== null ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
						<Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
					</View>
				</View>
				<Ionicons name="chevron-forward" size={20} color={colors.primary} />
			</View>
		</TouchableHighlight>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.track, paddingVertical: 12, paddingHorizontal: 14 },
		avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.shelf },
		texts: { flex: 1, marginHorizontal: 14 },
		title: { color: colors.text, fontSize: 18, fontWeight: '600' },
		subtitle_row: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
		dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
		subtitle: { color: colors.subtext, fontSize: 13, flexShrink: 1 }
	});
