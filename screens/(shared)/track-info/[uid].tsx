import { milliseconds_of } from '@common/utils/util';
import ModalHeader from '@components/ModalHeader';
import ScaledImage from '@components/ScaledImage';
import usePTheme from '@hooks/usePTheme';
import { GLOBALS } from '@illusive/globals';
import { artist_string, duration_to_string } from '@illusive/illusive_utils';
import type { Prefs } from '@illusive/prefs';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Easing, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import TrackIconTags from '@components/TrackIconTags';
import TextTicker from 'react-native-text-ticker';
import HeaderWith from '@components/HeaderWith';
import IImage from '@components/IImage';
import useTrackColors from '@hooks/useTrackColors';
import { ExampleObj } from '@utils/example_objs';
import { SharedRouter } from '@utils/shared_routes';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import type { GraphPoint } from 'react-native-graph';
import { SQLTrackPlays } from '@illusive/sql/sql_track_plays';
import { DateLineGraph } from '@components/DateLineGraph';
import useDimensions from '@hooks/useDimensions';
import type { Track, TrackAnalysisData } from '@illusive/types';
import { read_plain_lyrics } from '@utils/track_lyrics';
import { catch_log } from '@common/utils/error_util';

type VibeKey = keyof Pick<TrackAnalysisData, 'valence' | 'energy' | 'arousal' | 'danceability' | 'brightness' | 'liveness' | 'speechiness' | 'instrumentalness' | 'acousticness'>;

const VIBES_AXES: { key: VibeKey; label: string }[] = [
	{ key: 'valence', label: 'Valence' },
	{ key: 'energy', label: 'Energy' },
	{ key: 'arousal', label: 'Arousal' },
	{ key: 'danceability', label: 'Dance' },
	{ key: 'brightness', label: 'Bright' },
	{ key: 'liveness', label: 'Live' },
	{ key: 'speechiness', label: 'Speech' },
	{ key: 'instrumentalness', label: 'Instr.' },
	{ key: 'acousticness', label: 'Acoustic' }
];

function is_score(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function vibe_axes(analysis: TrackAnalysisData | undefined) {
	return VIBES_AXES.filter(({ key }) => is_score(analysis?.[key]));
}

const PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function camelot_of(key: string): string | undefined {
	const match = /^([A-G])\s*([#♯b♭]?)\s*(major|minor|maj|min|m)?/i.exec(key.trim());
	if (!match) return undefined;
	const accidental = match[2] === '#' || match[2] === '♯' ? 1 : match[2] === 'b' || match[2] === '♭' ? -1 : 0;
	const pc = (PITCH_CLASSES[match[1].toUpperCase()] + accidental + 12) % 12;
	const quality = match[3]?.toLowerCase();
	const minor = quality !== undefined && quality.startsWith('m') && !quality.startsWith('maj');
	const major_pc = minor ? (pc + 3) % 12 : pc;
	return `${((major_pc * 7 + 7) % 12) + 1}${minor ? 'A' : 'B'}`;
}

function hours_string(seconds: number) {
	if (seconds <= 0) return '—';
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours === 0) return `${Math.max(minutes, 1)}m`;
	return `${hours}h ${minutes}m`;
}

function VibesRadar(props: { analysis: TrackAnalysisData | undefined; color: string; line_color: string; label_color: string; value_color: string; size?: number }) {
	const size = props.size ?? 280;
	const axes = vibe_axes(props.analysis);
	if (axes.length < 3) return null;

	const cx = size / 2;
	const cy = size / 2;
	const r_max = size * 0.3;
	const n = axes.length;
	const angle_at = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
	const point_at = (i: number, t: number) => {
		const a = angle_at(i);
		return { x: cx + Math.cos(a) * r_max * t, y: cy + Math.sin(a) * r_max * t };
	};
	const to_points = (points: { x: number; y: number }[]) => points.map(p => `${p.x},${p.y}`).join(' ');

	const values = axes.map(({ key }) => props.analysis?.[key] ?? 0);
	const grid = [0.25, 0.5, 0.75, 1.0];
	const data_points = values.map((v, i) => point_at(i, v));

	return (
		<Svg width={size} height={size}>
			{grid.map((t, idx) => (
				<Polygon
					key={`g-${idx}`}
					points={to_points(axes.map((_, i) => point_at(i, t)))}
					fill="none"
					stroke={props.line_color}
					strokeWidth={t === 1 ? 1 : 0.5}
					strokeDasharray={t === 1 ? undefined : [2, 3]}
				/>
			))}
			{axes.map((_, i) => {
				const p = point_at(i, 1);
				return <Line key={`a-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={props.line_color} strokeWidth={0.5} />;
			})}
			<Polygon points={to_points(data_points)} fill={props.color + '33'} stroke={props.color} strokeWidth={1.25} strokeLinejoin="round" />
			{axes.map(({ label }, i) => {
				const cos = Math.cos(angle_at(i));
				const lp = point_at(i, 1.22);
				const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
				return (
					<React.Fragment key={`l-${i}`}>
						<SvgText fill={props.label_color} fontSize={11} textAnchor={anchor} transform={[{ translateX: lp.x }, { translateY: lp.y - 1 }]}>
							{label}
						</SvgText>
						<SvgText fill={props.value_color} fontSize={12} fontWeight="600" textAnchor={anchor} transform={[{ translateX: lp.x }, { translateY: lp.y + 12 }]}>
							{Math.round(values[i] * 100)}
						</SvgText>
					</React.Fragment>
				);
			})}
		</Svg>
	);
}

function source_links(track: Track | undefined): { label: string; id: string; url?: string }[] {
	if (!track) return [];
	const sources: { label: string; id: string | number | undefined; url?: string }[] = [
		{ label: 'Illusi', id: track.illusi_id },
		{ label: 'YouTube', id: track.youtube_id, url: track.youtube_id ? `https://www.youtube.com/watch?v=${track.youtube_id}` : undefined },
		{
			label: 'SoundCloud',
			id: track.soundcloud_permalink ?? track.soundcloud_id,
			url: track.soundcloud_permalink ? (track.soundcloud_permalink.startsWith('http') ? track.soundcloud_permalink : `https://soundcloud.com/${track.soundcloud_permalink}`) : undefined
		},
		{ label: 'Spotify', id: track.spotify_id, url: track.spotify_id ? `https://open.spotify.com/track/${track.spotify_id}` : undefined },
		{ label: 'Apple Music', id: track.applemusic_id },
		{ label: 'Amazon Music', id: track.amazonmusic_id },
		{ label: 'Deezer', id: track.deezer_id, url: track.deezer_id ? `https://www.deezer.com/track/${track.deezer_id}` : undefined },
		{ label: 'Tidal', id: track.tidal_id, url: track.tidal_id ? `https://tidal.com/browse/track/${track.tidal_id}` : undefined },
		{ label: 'Pandora', id: track.pandora_id },
		{ label: 'BandLab', id: track.bandlab_id },
		{ label: 'Audiomack', id: track.audiomack_id },
		{ label: 'Imported', id: track.imported_id }
	];
	return sources.filter(source => source.id !== undefined && source.id !== '').map(source => ({ ...source, id: String(source.id) }));
}

export default function EditTrackModal() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { width, height } = useDimensions();
	const gradient_height = useMemo(() => height * 0.8, [height]);
	const artwork_width = useMemo(() => width * 0.85, [width]);

	const { uid } = useLocalSearchParams<{ uid: string }>();
	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));

	const { track_colors } = useTrackColors(track_ref.current);
	const tint = GLOBALS.global_var.tint_table.get(track_ref.current?.uid ?? '');
	const [plays_points, set_plays_points] = useState<GraphPoint[]>([]);
	const [lyrics, set_lyrics] = useState<string | null>(null);

	useEffect(() => {
		if (track_ref.current?.lyrics_uri) {
			read_plain_lyrics(track_ref.current).then((content) => {
				if (content !== undefined) set_lyrics(content);
			}).catch(catch_log);
		}
		if (track_ref.current?.uid) {
			const dates = SQLTrackPlays.get_track_plays_dates_sync(uid, {});
			let count = 0;
			set_plays_points(dates.map(date => ({ value: (track_ref.current?.meta?.plays ?? 0) - dates.length + ++count, date: new Date(date.created_at) })));
		}
	}, []);
	const unknown = 'Unknown';

	function date_string(isostring?: string) {
		const date = new Date(isostring ?? 0);
		if (date.getTime() <= milliseconds_of({ years: 30 })) return unknown;
		return date.toDateString();
	}

	const track = track_ref.current;
	const meta = track?.meta;
	const analysis = track?.analysis;

	const is_trimmed = meta?.begdur && meta?.begdur !== 0 && meta?.enddur && meta?.enddur !== (track?.duration ?? 0);
	const played_duration = (meta?.enddur ?? track?.duration ?? 0) - (meta?.begdur ?? 0);

	const has_radar = vibe_axes(analysis).length >= 3;
	const camelot = analysis?.key ? camelot_of(analysis.key) : undefined;
	const facts: [string, string][] = [];
	if (analysis?.tempo) facts.push(['Tempo', `${Math.round(analysis.tempo)} BPM`]);
	if (analysis?.key) facts.push([camelot ? `Key · ${camelot}` : 'Key', analysis.key]);
	if (analysis?.mood) facts.push(['Mood', analysis.mood]);
	if (analysis?.genre) facts.push(['Genre', analysis.genre]);
	const has_analysis = has_radar || facts.length > 0;

	const sources = source_links(track);
	const chapters = meta?.chapters ?? [];

	const yes_no = (value: boolean | undefined) => (value === undefined ? unknown : value ? 'Yes' : 'No');
	const base_data: [string, string][] = [];
	if (track?.alt_title) base_data.push(['Alt Title', track.alt_title]);
	if (track?.prods?.length) base_data.push(['Producers', track.prods.map(prod => prod.name).join(', ')]);
	base_data.push(
		['Added', date_string(meta?.added_date)],
		['Downloaded', date_string(meta?.downloaded_date)],
		['Last Played', date_string(meta?.last_played_date)],
		['Last Sampled', date_string(meta?.last_sampled_date)],
		['Explicit', track?.explicit === 'EXPLICIT' ? 'Explicit' : track?.explicit === 'CLEAN' ? 'Clean' : 'No']
	);
	if (track?.unreleased) base_data.push(['Unreleased', 'Yes']);
	base_data.push(
		['Age Restricted', yes_no(meta?.age_restricted)],
		['Unavailable', yes_no(meta?.unavailable)],
		['Track Range', `${duration_to_string(meta?.begdur ?? 0) || '0:00'} – ${duration_to_string(meta?.enddur ?? track?.duration ?? 0)}${is_trimmed ? ` (trimmed)` : ''}`]
	);
	if (meta?.nsplit) base_data.push(['Split', `Part ${meta.nsplit}`]);
	base_data.push(['Lyrics', track?.lyrics_uri ? (track.sync_status && track.sync_status !== 'NONE' ? `Synced (${track.sync_status.toLowerCase()})` : 'Plain') : 'None']);
	if (track?.service_plays) base_data.push(['Service Plays', track.service_plays.toLocaleString()]);

	const stats: [string, string][] = [
		['PLAYS', (meta?.plays ?? 0).toLocaleString()],
		['DURATION', duration_to_string(track?.duration ?? 0) || '—'],
		['LISTENED', hours_string((meta?.plays ?? 0) * played_duration)],
		['ADDED', meta?.added_date ? new Date(meta.added_date).toLocaleDateString() : '—']
	];

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Track Info" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			<ScrollView scrollToOverflowEnabled={false}>
				{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, 'transparent']} style={{ position: 'absolute', top: 0, height: gradient_height, width: '100%' }} /> : null}

				{/* Artwork */}
				<View style={{ width: '100%', alignItems: 'center', maxHeight: 450, minHeight: 350, overflow: 'hidden', marginTop: 30 }}>
					<ScaledImage tint={tint ? { color: tint, opacity: 0.15 } : undefined} artwork={track?.playback?.artwork} width={artwork_width} style={{ borderRadius: 10 }} />
				</View>

				{/* Track identity */}
				<View style={{ marginHorizontal: 16, marginTop: 8 }}>
					<TextTicker style={{ color: colors.text, fontWeight: 'bold', fontSize: 22 }} scroll={false} duration={18000} bounce={false} easing={Easing.linear}>
						{track?.title ?? ''}
					</TextTicker>
					<Text style={{ color: colors.subtext, fontSize: 16, marginTop: 2 }}>{artist_string(track!)}</Text>
					{track?.album?.name ? <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 2 }}>{track.album.name}</Text> : null}
					<View style={{ flexDirection: 'row', marginTop: 6 }}>
						<TrackIconTags track_data={track ?? ExampleObj.track_example0} is_downloading={false} size={22} darken />
					</View>
				</View>

				{/* Stats row */}
				<View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 16 }}>
					{stats.map(([label, value]) => (
						<View key={label} style={{ flex: 1, alignItems: 'center' }}>
							<Text style={styles.stat_label}>{label}</Text>
							<Text numberOfLines={1} adjustsFontSizeToFit style={styles.stat_value}>{value}</Text>
						</View>
					))}
				</View>

				{/* Analysis */}
				{has_analysis ? (
					<View style={styles.section_card}>
						<Text style={styles.section_label}>Analysis</Text>
						<View style={styles.field_divider} />
						{facts.length > 0 ? (
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
								{facts.map(([label, value]) => (
									<View key={label} style={styles.fact}>
										<Text style={styles.fact_label}>{label}</Text>
										<Text numberOfLines={1} style={styles.fact_value}>{value}</Text>
									</View>
								))}
							</View>
						)
							: null}
						{has_radar ? (
							<View style={{ alignItems: 'center', marginTop: facts.length > 0 ? 4 : 12 }}>
								<VibesRadar analysis={analysis} color={colors.primary} line_color={colors.text + '1a'} label_color={colors.subtext} value_color={colors.text} size={Math.min(width - 64, 320)} />
							</View>
						)
							: null}
					</View>
				)
					: null}

				{/* Data table card */}
				<View style={styles.section_card}>
					<Text style={styles.section_label}>Details</Text>
					<View style={styles.field_divider} />
					{base_data.map(([label, value], i) => (
						<React.Fragment key={label}>
							<View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11 }}>
								<Text style={styles.row_label}>{label}</Text>
								<Text style={styles.row_value}>{value}</Text>
							</View>
							{i < base_data.length - 1 ? <View style={styles.row_divider} /> : null}
						</React.Fragment>
					))}
				</View>

				{/* Sources */}
				{sources.length > 0 ? (
					<View style={styles.section_card}>
						<Text style={styles.section_label}>Sources</Text>
						<View style={styles.field_divider} />
						{sources.map(({ label, id, url }, i) => (
							<React.Fragment key={label}>
								<TouchableOpacity
									disabled={url === undefined}
									onPress={() => url && Linking.openURL(url).catch(catch_log)}
									style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}
								>
									<Text style={styles.row_label}>{label}</Text>
									<Text numberOfLines={1} style={[styles.row_value, url ? { color: colors.primary } : null]}>{id}</Text>
									{url ? <Ionicons name="open-outline" size={14} color={colors.primary} style={{ marginLeft: 6 }} /> : null}
								</TouchableOpacity>
								{i < sources.length - 1 ? <View style={styles.row_divider} /> : null}
							</React.Fragment>
						))}
					</View>
				)
					: null}

				{/* Chapters */}
				{chapters.length > 0 ? (
					<View style={styles.section_card}>
						<Text style={styles.section_label}>Chapters</Text>
						<View style={styles.field_divider} />
						{chapters.map((chapter, i) => (
							<React.Fragment key={`${chapter.start_time}-${chapter.title}`}>
								<View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
									<Text style={styles.chapter_time}>{duration_to_string(chapter.start_time) || '0:00'}</Text>
									<Text style={styles.row_value}>{chapter.title}</Text>
								</View>
								{i < chapters.length - 1 ? <View style={styles.row_divider} /> : null}
							</React.Fragment>
						))}
					</View>
				)
					: null}

				{/* Songs horizontal section */}
				{(meta?.songs?.length ?? 0) > 0 ? (
					<View style={{ marginHorizontal: 16, marginTop: 16 }}>
						<HeaderWith title="Songs">
							<ScrollView horizontal style={{ height: 180, top: 10 }} contentContainerStyle={{ flexDirection: 'row', marginHorizontal: 15 }}>
								{meta?.songs?.map((song, i) => (
									<View key={i + song.title} style={{ width: 120, marginHorizontal: 5 }}>
										<IImage source={song.artwork_url} width={120} height={120} style={{ borderRadius: 5 }} />
										<Text numberOfLines={1} style={{ color: colors.text, fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
											{song.title}
										</Text>
										<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12 }}>
											{song.artist}
										</Text>
										<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12 }}>
											{song.album}
										</Text>
									</View>
								))}
							</ScrollView>
						</HeaderWith>
					</View>
				)
					: null}

				<DateLineGraph title="Plays over time" points={plays_points} />

				{/* Lyrics card */}
				{lyrics !== null ? (
					<View style={styles.section_card}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={styles.section_label}>Lyrics</Text>
							<TouchableOpacity style={styles.action_button_inline} onPress={() => SharedRouter.goto_shared_player_lyrics_share()}>
								<Ionicons name="share-outline" size={14} color={colors.primary} style={{ marginRight: 5 }} />
								<Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Share</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.field_divider} />
						<Text style={{ color: colors.text, fontSize: 16, lineHeight: 26, fontWeight: '500', marginTop: 12 }}>
							{lyrics
								.split('\n')
								.map(line => (/^\[.+?\]$/.test(line.trim()) ? '' : line))
								.join('\n')}
						</Text>
					</View>
				)
					: null}
				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		section_card: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#ffffff06', borderRadius: 16, borderWidth: 0.5, borderColor: '#ffffff0f', padding: 16 },
		section_label: { color: colors.text, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
		field_divider: { height: 0.5, backgroundColor: colors.text + '30', marginTop: 8 },
		row_divider: { height: 0.5, backgroundColor: colors.text + '18' },
		row_label: { width: '45%', color: colors.searchPlaceholder, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
		row_value: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' },
		stat_label: { color: colors.searchPlaceholder, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
		stat_value: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 2 },
		chapter_time: { width: 64, color: colors.primary, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
		fact: { width: '50%', paddingVertical: 10, paddingRight: 8 },
		fact_label: { color: colors.subtext, fontSize: 12 },
		fact_value: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
		action_button_inline: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '18', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 0.5, borderColor: colors.primary + '30' }
	});
