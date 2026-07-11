import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import usePTheme from "@hooks/usePTheme";
import type { RozContent } from "@roze/types/roz";
import { text_style_map } from "@roze/mobile/text_style";
import { get_window_size } from "@roze/mobile/paginator";
import { build_page_timeline, page_index_at_time, type AudiobookPageTimeline } from "@roze/mobile/audiobook_timeline";
import type { UseAudiobookPlayer } from "./useAudiobookPlayer";

const H_PADDING = 28;
const V_PADDING = 220;
const TEXT_BOTTOM_MARGIN = 14;

// Player3: same dynamic image as Player2, but heavily darkened/blurred behind the
// full page of text (paginated from the roz contents). The currently-narrated
// paragraph is highlighted in the theme tint.
export default function AudiobookPlayer3(props: { player: UseAudiobookPlayer }) {
	const { player } = props;
	const { colors } = usePTheme();
	const tint = colors.primary;
	const [timeline, set_timeline] = useState<AudiobookPageTimeline | null>(null);

	const image = player.current_image;
	const uri = image ? image.image : player.meta?.cover && player.meta.cover.length > 0 ? player.meta.cover : undefined;

	// Pagination measures real text height, so it is async + expensive. Player3 is
	// only mounted while mode 3 is active, so building once on mount is fine.
	useEffect(() => {
		let cancelled = false;
		if (player.roz === null) return;
		const window_size = get_window_size({ horizontal_padding: H_PADDING * 2, vertical_padding: V_PADDING });
		build_page_timeline(player.roz, window_size, TEXT_BOTTOM_MARGIN)
			.then((t) => {
				if (!cancelled) set_timeline(t);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [player.roz]);

	const page_index = useMemo(() => (timeline ? page_index_at_time(timeline, player.global_time) : 0), [timeline, player.global_time]);
	const page = timeline?.pages[page_index];
	const current_uuid = player.current_content?.content.uuid;

	return (
		<View style={StyleSheet.absoluteFill}>
			{uri ? <Image key={uri} source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={24} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0c0f" }]} />}
			<BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
			<View style={[StyleSheet.absoluteFill, { backgroundColor: "#000000cc" }]} />
			<LinearGradient colors={["rgba(0,0,0,0.6)", "transparent", "rgba(0,0,0,0.9)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

			<View style={styles.page_area} pointerEvents="box-none">
				{timeline === null ? null : page ? (
					<Animated.View key={page_index} entering={FadeIn.duration(280)} style={styles.page}>
						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page_scroll}>
							{page.contents.map((content) => (
								<PageContent key={content.uuid} content={content} tint={tint} is_current={content.uuid === current_uuid} />
							))}
						</ScrollView>
					</Animated.View>
				) : null}
			</View>

			{timeline && timeline.pages.length > 0 ? (
				<View style={styles.page_indicator} pointerEvents="none">
					<Text style={styles.page_indicator_text}>
						{page_index + 1} / {timeline.pages.length}
					</Text>
				</View>
			) : null}
		</View>
	);
}

function PageContent(props: { content: RozContent; tint: string; is_current: boolean }) {
	const { content, tint, is_current } = props;
	if (content.type === "IMAGE") {
		return <Image source={{ uri: content.content }} style={styles.page_image} resizeMode="contain" />;
	}
	if (content.type === "LINE_BREAK" || content.type === "THEME_BREAK") {
		return <View style={styles.spacer} />;
	}
	const base = text_style_map[content.type](is_current ? tint : "#e9e9ee");
	return <Text style={[styles.text, base, is_current && styles.current_text]}>{content.content}</Text>;
}

const styles = StyleSheet.create({
	page_area: { ...StyleSheet.absoluteFill, paddingHorizontal: H_PADDING, paddingTop: 110, paddingBottom: 250 },
	page: { flex: 1 },
	page_scroll: { paddingVertical: 6 },
	text: { marginBottom: TEXT_BOTTOM_MARGIN, lineHeight: 22 },
	current_text: { fontWeight: "700" },
	page_image: { width: "100%", height: 320, marginBottom: TEXT_BOTTOM_MARGIN, borderRadius: 8 },
	spacer: { height: 12 },
	page_indicator: { position: "absolute", bottom: 224, left: 0, right: 0, alignItems: "center" },
	page_indicator_text: { color: "#ffffff99", fontSize: 12, fontWeight: "600" }
});
