import React, { useState, useEffect } from 'react';
import { View, FlatList, Alert, Text, Pressable, StyleSheet } from 'react-native';
import type { Track } from '@illusive/types';
import { unzip_backpack } from '@illusive/backpack';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import SongComponentBackpack from '@components/TrackComponentBackpack';
import usePTheme from '@hooks/usePTheme';
import { SQLBackpack } from '@illusive/sql/sql_backpack';
import { Ionicons } from '@expo/vector-icons';
import type { Prefs } from '@illusive/prefs';

export default function ExtraBackpackScreen() {
	const { colors } = usePTheme();
	const [mode_index, set_mode_index] = useState(0);
	const [backpack_tracks, set_backpack_tracks] = useState<Track[]>([]);
	const [unzipped_backpack_tracks, set_unzipped_backpack_tracks] = useState<Track[]>([]);

	function ask_consent(title: string, confirmText: string, func: () => Promise<void>) {
		Alert.alert(
			title,
			confirmText,
			[{ text: 'Cancel' },
			{ text: 'OK', onPress: async () => { await func(); } }]
		);
	}

	async function unzip_backpack_tracks() {
		set_unzipped_backpack_tracks(await unzip_backpack(backpack_tracks));
		set_mode_index(1);
	}

	useEffect(() => {
		(async function () {
			set_backpack_tracks(await SQLBackpack.backpack_tracks());
		})();
	}, []);

	const styles = make_styles(colors);

	const render_item = (item: { item: Track }) => (
		<SongComponentBackpack track_data={item.item} />
	);

	const render_backpack_header = () => (
		<View>
			<View style={styles.count_row}>
				<Text style={styles.count_num}>{backpack_tracks.length}</Text>
				<Text style={styles.count_unit}>{backpack_tracks.length === 1 ? 'track' : 'tracks'}</Text>
			</View>

			<View style={styles.actions_row}>
				<Pressable
					style={({ pressed }) => [styles.action_card, pressed && styles.action_pressed]}
					onPress={() => ask_consent('Restore tracks in Backpack', 'Are you sure you want to restore tracks in your Backpack', unzip_backpack_tracks)}
				>
					<Ionicons name='refresh' size={20} color={colors.primary} />
					<Text style={[styles.action_label, { color: colors.primary }]}>Restore</Text>
				</Pressable>

				<Pressable
					style={({ pressed }) => [styles.action_card, pressed && styles.action_pressed]}
					onPress={() => ask_consent('Clear Backpack', 'Are you sure you want to clear your Backpack', async () => {
						await SQLBackpack.empty_backpack();
						set_backpack_tracks([]);
					})}
				>
					<Ionicons name='trash-outline' size={20} color={colors.red} />
					<Text style={[styles.action_label, { color: colors.red }]}>Clear</Text>
				</Pressable>
			</View>

			<View style={styles.list_header_row}>
				<View style={styles.divider} />
				<Text style={styles.list_header_label}>IN BACKPACK</Text>
				<View style={styles.divider} />
			</View>
		</View>
	);

	const render_conversion_header = () => (
		<View style={styles.list_header_row}>
			<View style={styles.divider} />
			<Text style={styles.list_header_label}>RESTORED TRACKS</Text>
			<View style={styles.divider} />
		</View>
	);

	const backpack_empty_state = () => (
		<View style={styles.empty_state}>
			<View style={[styles.empty_icon_bg, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<Ionicons name='archive-outline' size={40} color={colors.deeptext} />
			</View>
			<Text style={[styles.empty_title, { color: colors.text }]}>Backpack is empty</Text>
			<Text style={[styles.empty_sub, { color: colors.subtext }]}>{'Tracks you save to your Backpack\nwill appear here'}</Text>
		</View>
	);

	const conversion_empty_state = () => (
		<View style={styles.empty_state}>
			<View style={[styles.empty_icon_bg, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<Ionicons name='swap-horizontal-outline' size={40} color={colors.deeptext} />
			</View>
			<Text style={[styles.empty_title, { color: colors.text }]}>No conversions yet</Text>
			<Text style={[styles.empty_sub, { color: colors.subtext }]}>{'Go to Backpack and tap Restore\nto convert your saved tracks'}</Text>
		</View>
	);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.segment_wrapper}>
				<SegmentedControl
					values={['Backpack', 'Conversion']}
					selectedIndex={mode_index}
					fontStyle={{ color: colors.text }}
					onChange={(event) => set_mode_index(event.nativeEvent.selectedSegmentIndex)}
				/>
			</View>

			{mode_index === 0 && (
				backpack_tracks.length === 0
					? backpack_empty_state()
					: <FlatList
						data={backpack_tracks}
						renderItem={render_item}
						ListHeaderComponent={render_backpack_header}
						contentContainerStyle={styles.list_content}
					  />
			)}

			{mode_index === 1 && (
				unzipped_backpack_tracks.length === 0
					? conversion_empty_state()
					: <FlatList
						data={unzipped_backpack_tracks}
						renderItem={render_item}
						ListHeaderComponent={render_conversion_header}
						contentContainerStyle={styles.list_content}
					  />
			)}
		</View>
	);
}

const make_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		container: {
			flex: 1,
			width: '100%',
		},
		segment_wrapper: {
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 4,
		},
		count_row: {
			flexDirection: 'row',
			alignItems: 'baseline',
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 2,
			gap: 8,
		},
		count_num: {
			fontSize: 40,
			fontWeight: '700',
			color: colors.title,
			letterSpacing: -1.5,
		},
		count_unit: {
			fontSize: 16,
			fontWeight: '500',
			color: colors.subtext,
		},
		actions_row: {
			flexDirection: 'row',
			gap: 10,
			paddingHorizontal: 16,
			paddingTop: 14,
			paddingBottom: 4,
		},
		action_card: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 13,
			borderRadius: 12,
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: colors.border,
		},
		action_pressed: {
			opacity: 0.6,
		},
		action_label: {
			fontSize: 14,
			fontWeight: '600',
		},
		list_header_row: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingTop: 20,
			paddingBottom: 10,
			gap: 10,
		},
		divider: {
			flex: 1,
			height: 1,
			backgroundColor: colors.line,
		},
		list_header_label: {
			fontSize: 10,
			fontWeight: '700',
			letterSpacing: 1.5,
			color: colors.subtext,
		},
		list_content: {
			paddingBottom: 32,
		},
		empty_state: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingBottom: 80,
			gap: 14,
		},
		empty_icon_bg: {
			width: 88,
			height: 88,
			borderRadius: 24,
			borderWidth: 1,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: 4,
		},
		empty_title: {
			fontSize: 18,
			fontWeight: '600',
			letterSpacing: -0.3,
		},
		empty_sub: {
			fontSize: 14,
			textAlign: 'center',
			lineHeight: 22,
		},
	});
