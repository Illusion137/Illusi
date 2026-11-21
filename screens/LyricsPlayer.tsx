import TTMLLyrics, { type TTMLLyricsHandle } from '@components/lyrics/TTMLLyrics';
import usePTheme from '@hooks/usePTheme';
import useNeighborLyricsPreload from '@hooks/useNeighborLyricsPreload';
import useTrackColors from '@hooks/useTrackColors';
import useTrackLyrics from '@hooks/useTrackLyrics';
import type { Track } from '@illusive/types';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeGesture } from 'react-native-gesture-handler';
import { SharedRouter } from '@utils/shared_routes';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

const screen_w = Dimensions.get('screen').width;
const LYRICS_PLAYER_HEIGHT = screen_w + 30;

interface LyricsPlayerProps {
	visible: boolean;
	playing_track: Track;
	lyrics_uri: string | null;
	scroll_gesture: NativeGesture;
}

const LyricsPlayer = memo(function LyricsPlayer({ visible, playing_track, lyrics_uri, scroll_gesture }: LyricsPlayerProps) {
	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(playing_track);

	const [content_active, set_content_active] = useState(false);
	const [is_following, set_is_following] = useState(true);
	const lyrics_ref = useRef<TTMLLyricsHandle>(null);

	const lyrics = useTrackLyrics(playing_track, content_active && lyrics_uri !== null);
	useNeighborLyricsPreload(playing_track);

	const overlay_opacity = useSharedValue(0);
	const slide_y = useSharedValue(LYRICS_PLAYER_HEIGHT);

	useEffect(() => {
		if (visible) {
			overlay_opacity.value = withTiming(1, { duration: 300 });
			slide_y.value = withDelay(150, withSpring(0, { damping: 32, stiffness: 140 }));
		} else {
			slide_y.value = withTiming(LYRICS_PLAYER_HEIGHT, { duration: 250, easing: Easing.in(Easing.ease) });
			overlay_opacity.value = withDelay(100, withTiming(0, { duration: 200 }));
		}
	}, [visible]);

	const overlay_opacity_style = useAnimatedStyle(() => ({ opacity: overlay_opacity.value }));
	const slide_style = useAnimatedStyle(() => ({ transform: [{ translateY: slide_y.value }] }));

	useEffect(() => {
		if (visible) {
			set_content_active(true);
			return;
		}
		const t = setTimeout(() => set_content_active(false), 320);
		return () => clearTimeout(t);
	}, [visible]);

	useEffect(() => set_is_following(true), [lyrics]);

	if (!content_active) return null;

	return (
		<Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: LYRICS_PLAYER_HEIGHT, zIndex: 20, overflow: 'hidden' }, overlay_opacity_style]} pointerEvents={visible ? 'auto' : 'none'}>
			<Animated.View style={[StyleSheet.absoluteFill, slide_style]}>
				{lyrics_uri ? (
					<TouchableOpacity style={{ position: 'absolute', top: 8, right: 12, zIndex: 2 }} onPress={() => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri)}>
						<Ionicons name="pencil-outline" size={18} color={track_colors?.background ?? colors.primary} />
					</TouchableOpacity>
				)
					: null}
				<MaskedView style={{ flex: 1 }} maskElement={<LinearGradient colors={['transparent', 'black', 'black', 'transparent']} locations={[0, 0.12, 0.93, 1]} style={{ flex: 1 }} />}>
					{lyrics ? (
						<TTMLLyrics key={playing_track.uid} ref={lyrics_ref} lyrics={lyrics} color={colors.text} font_size={20} padding_horizontal={20} on_follow_change={set_is_following} scroll_gesture={scroll_gesture} />
					) : lyrics === null
						? (
								<View style={styles.empty}>
									<Text style={{ color: colors.subtext, fontSize: 14 }}>No lyrics available</Text>
								</View>
							)
						: null}
				</MaskedView>
				{lyrics && lyrics.sync_type !== 'NONE' && !is_following ? (
					<Pressable style={[styles.sync_button, { backgroundColor: track_colors?.secondary ?? colors.shelf }]} onPress={() => lyrics_ref.current?.resume_follow()}>
						<Ionicons name="sync-outline" size={11} color={track_colors?.background ?? colors.primary} />
						<Text style={[styles.sync_button_text, { color: track_colors?.background ?? colors.primary }]}>Sync</Text>
					</Pressable>
				)
					: null}
			</Animated.View>
		</Animated.View>
	);
});

export default LyricsPlayer;

const styles = StyleSheet.create({
	empty: { height: LYRICS_PLAYER_HEIGHT * 0.6, alignItems: 'center', justifyContent: 'center' },
	sync_button: { position: 'absolute', bottom: 14, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, zIndex: 2 },
	sync_button_text: { fontWeight: '700', fontSize: 11 }
});
