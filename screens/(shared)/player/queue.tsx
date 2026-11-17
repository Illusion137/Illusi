import ModalHeader from '@components/ModalHeader';
import TrackComponentBase from '@components/TrackComponentBase';
import { Ionicons } from '@expo/vector-icons';
import usePTheme from '@hooks/usePTheme';
import { active_track_index, player_queue_tracks, remove_from_player_queue } from '@utils/player_queue';
import type { Track } from '@illusive/types';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Event, useTrackPlayerEvents } from 'react-native-everything-player';
import { catch_log } from '@common/utils/error_util';

export default function AudioPlayerQueue() {
	const { colors } = usePTheme();

	const [queue_data, set_queue_data] = useState<Track[]>([]);

	const render_now_playing_item = (item: { item: Track }) => (
		<TrackComponentBase
			track_data={item.item}
			on_press={() => {
				return;
			}}
			on_long_press={() => {
				return;
			}}
			disabled={true}
		/>
	);

	function updated_queue_items() {
		const current_track_index = active_track_index();
		if (current_track_index === undefined) return;
		set_queue_data(player_queue_tracks().slice(current_track_index));
	}

	async function remove_track_from_queue(item: Track) {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(catch_log);
		const active_index = active_track_index();
		if (active_index === undefined) return;
		await remove_from_player_queue(item, active_index);
		updated_queue_items();
	}

	useEffect(() => {
		updated_queue_items();
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
		if (event.index !== undefined) updated_queue_items();
	});

	return (
		<>
			<ModalHeader title={queue_data.length > 50 ? 'Up Next (Truncated)' : 'Up Next'} />
			<View style={{ flex: 1, backgroundColor: colors.background }}>
				<SwipeListView
					data={queue_data.slice(1, 50)}
					renderItem={render_now_playing_item}
					ListHeaderComponent={() => (
						<View style={{ flex: 1, width: '100%', height: 140 }}>
							<Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', padding: 10 }}>Now Playing</Text>
							{queue_data[0] ? render_now_playing_item({ item: queue_data[0] }) : null}
							<Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', padding: 10 }}>Up Next</Text>
						</View>
					)}
					renderHiddenItem={item => (
						<TouchableOpacity onPress={async () => remove_track_from_queue(item.item)} style={{ backgroundColor: '#8B0000', flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
							<Ionicons name="trash-bin" style={{ right: 10 }} color="white" size={22} />
						</TouchableOpacity>
					)}
					rightOpenValue={-75}
					rightActionValue={-80}
					rightActivationValue={-80}
					disableRightSwipe
				/>
			</View>
		</>
	);
}
