import { memo, useEffect, useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { selection_store } from '@illusive/stores/selection_store';
import useSelectionStore from '@hooks/useSelectionStore';
import FourTrackArtwork from './FourTrackArtwork';
import type { Playlist, Track } from '@illusive/types';
import type { Prefs } from '@illusive/prefs';
import { ContextMenuView, type MenuConfig } from '@components/ContextMenu';
import { Constants } from '@illusive/constants';
import usePTheme from '@hooks/usePTheme';
import { SharedRouter } from '@utils/shared_routes';
import { ContextResolver } from '@utils/context_resolver';
import { PlaylistContextMenu } from '@utils/context_menu';
import { reinterpret_cast } from '@common/cast';
import { empty_join_dot } from '../lib-origin/common/utils/util';
import { catch_log } from '@common/utils/error_util';

function PlaylistComponent(props: { playlist_data: Playlist; select?: { mode: boolean; track: Track; already_in?: boolean }; compact?: boolean }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [pinned, set_pinned] = useState(props.playlist_data.pinned);
	const [is_public, set_is_public] = useState(props.playlist_data.public);
	const [disabled, set_disabled] = useState(props.select?.already_in ?? false);
	const [visual_data, set_visual_data] = useState<Playlist['visual_data']>();

	const select_mode = props.select?.mode ?? false;
	const compact = props.compact ?? false;
	// Subscribed through the store so the checkmark flips synchronously on toggle
	// and only this row re-renders.
	const selected = useSelectionStore(state => state.selected_playlists_uuids.has(props.playlist_data.uuid));
	const current_playlist = (): Playlist => ({ ...props.playlist_data, pinned, public: is_public });
	const [context_menu, set_context_menu] = useState<MenuConfig>(() => PlaylistContextMenu.playlist_component_context_menu(current_playlist()));

	useEffect(() => {
		set_pinned(Boolean(props.playlist_data.pinned));
	}, [props.playlist_data.pinned]);
	useEffect(() => {
		set_is_public(Boolean(props.playlist_data.public));
	}, [props.playlist_data.public]);
	useEffect(() => {
		(async () => {
			if (props.playlist_data.visual_data) {
				const resolved_tracks = await Promise.resolve(props.playlist_data.visual_data.four_track);
				set_visual_data({ four_track: resolved_tracks?.slice(0, 4) ?? [], track_count: resolved_tracks?.length ?? 0 });
			}
		})().catch(catch_log);
	}, [props.playlist_data]);

	useEffect(() => {
		async function init() {
			if (props.select === undefined || disabled) return;
			// Membership is normally batched by the parent; the per-row query is only
			// a fallback for callers that don't pass already_in.
			if (props.select.already_in !== undefined) {
				set_disabled(props.select.already_in);
				return;
			}
			set_disabled(await SQLPlaylists.track_exists_in_playlist({ uuid: props.playlist_data.uuid, track_uid: props.select.track.uid }));
		}
		init().catch(catch_log);
	}, [props.select]);

	function toggle_state() {
		selection_store.getState().toggle_selected_playlist(props.playlist_data.uuid);
	}

	async function on_press() {
		SharedRouter.goto_shared_playlist(props.playlist_data.uuid, 'UUID', {});
	}

	return (
		<ContextMenuView
			menuConfig={context_menu}
			isContextMenuEnabled={!select_mode}
			onMenuWillShow={() => {
				set_context_menu(PlaylistContextMenu.playlist_component_context_menu(current_playlist()));
			}}
			onPressMenuItem={async ({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
				ContextResolver.resolve_playlist_context(current_playlist(), reinterpret_cast<ContextResolver.PlaylistContextKeys>(nativeEvent.actionKey), (patch) => {
					if (patch.pinned !== undefined) set_pinned(patch.pinned);
					if (patch.public !== undefined) set_is_public(patch.public);
				}).catch(catch_log);
			}}
		>
			<TouchableOpacity
				disabled={disabled}
				style={{ ...styles.button, opacity: disabled ? 0.5 : 1.0, height: compact ? 55 : 80 }}
				onLongPress={() => {
					return;
				}}
				delayLongPress={Constants.long_press_delay}
				onPress={select_mode ? toggle_state : on_press}
			>
				<>
					<View style={{ width: 7 }} />
					<FourTrackArtwork thumbnail_uri={props.playlist_data.thumbnail_uri} four_track={visual_data?.four_track ?? []} size={compact ? 22 : 35} />
					<View style={{ flexDirection: 'column', left: 15, justifyContent: 'center' }}>
						<Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold' }}>{props.playlist_data.title}</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center', top: 2 }}>
							{pinned ? (
								<>
									<MaterialIcons name="push-pin" size={16} color={colors.primary} />
									<Text style={{ color: colors.subtext, fontSize: 14 }}> • </Text>
								</>
							)
								: null}
							<Text style={{ color: colors.subtext, fontSize: 14 }}>{empty_join_dot([`${visual_data?.track_count ?? 0} ${(visual_data?.track_count ?? 0) === 1 ? 'track' : 'tracks'}`])}</Text>
							{is_public ? (
								<>
									<Text style={{ color: colors.subtext, fontSize: 14 }}> • </Text>
									<MaterialIcons name="people" size={16} color={colors.primary} />
								</>
							)
								: null}
						</View>
					</View>
					{!select_mode
						? null
						: (
								<View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 }}>
									<Ionicons name={selected ? 'checkmark' : 'ellipse-outline'} size={24} color={selected ? colors.green : colors.subtext} />
								</View>
							)}
				</>
			</TouchableOpacity>
			<View style={{ width: '100%', height: 1, marginLeft: 90, backgroundColor: colors.line }} />
		</ContextMenuView>
	);
}
export default memo(PlaylistComponent);
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({ button: { width: '100%', alignItems: 'center', backgroundColor: colors.track, flexDirection: 'row' }, notfound: { width: 70, height: 70, borderRadius: 5, left: 15 } });
