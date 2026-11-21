import TTMLLyrics from '@components/lyrics/TTMLLyrics';
import usePTheme from '@hooks/usePTheme';
import useNeighborLyricsPreload from '@hooks/useNeighborLyricsPreload';
import useTrackLyrics from '@hooks/useTrackLyrics';
import type { Track } from '@illusive/types';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { has_synced_lyrics } from '@utils/track_lyrics';

interface ExternalSyncedLyricsProps {
	track: Track | undefined;
	width: number;
	height: number;
}

export default function ExternalSyncedLyrics({ track, width, height }: ExternalSyncedLyricsProps) {
	const { colors } = usePTheme();
	const lyrics = useTrackLyrics(track, has_synced_lyrics(track));
	useNeighborLyricsPreload(track);

	if (lyrics === null || lyrics === undefined || lyrics.sync_type === 'NONE') return null;

	return (
		<MaskedView style={{ width, height }} maskElement={<LinearGradient colors={['transparent', 'black', 'black', 'transparent']} locations={[0, 0.18, 0.82, 1]} style={{ flex: 1 }} />}>
			<TTMLLyrics lyrics={lyrics} color={colors.text} font_size={Math.max(28, height * 0.05)} padding_horizontal={32} anchor={0.4} style={{ width, height }} />
		</MaskedView>
	);
}
