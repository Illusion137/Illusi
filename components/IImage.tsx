import { reinterpret_cast } from "@common/cast";
import usePTheme from "@hooks/usePTheme";
import { resolved_artwork } from "@illusive/artwork";
import type { Artwork } from "@illusive/types";
import { fs } from "@native/fs/fs";
import { BlurView, type BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type ImageProps, type ViewStyle } from "react-native";
import { Image, type ImageContentFit, type ImageStyle as ExpoImageStyle } from "expo-image";
import hexToRgba from "hex-to-rgba";

export interface IImageProps {
	source: Artwork | undefined | null;
	tint?: { color: string; opacity: number };
	blur?: BlurViewProps;
	fade?: { percent: DimensionValue; color?: string; middle_opacity?: number; end_opacity?: number };
	useview?: boolean;
}

// expo-image uses contentFit; the codebase passes RN's resizeMode (as a prop or
// inside style). Map it so existing call sites keep their layout.
function to_content_fit(resize_mode: unknown): ImageContentFit {
	switch (resize_mode) {
		case "contain":
			return "contain";
		case "stretch":
			return "fill";
		case "center":
		case "repeat":
			return "none";
		default:
			return "cover";
	}
}

const MAX_CONCURRENT_FS_CHECKS = 5;
let active_fs_checks = 0;
const pending_fs_checks: (() => void)[] = [];

function run_throttled_fs_check(check: () => Promise<void>): void {
	const run = () => {
		active_fs_checks++;
		check().finally(() => {
			active_fs_checks--;
			const next = pending_fs_checks.shift();
			if (next) next();
		});
	};
	if (active_fs_checks < MAX_CONCURRENT_FS_CHECKS) run();
	else pending_fs_checks.push(run);
}

export default function IImage(props: Omit<ImageProps, "source"> & IImageProps) {
	const flat_style = reinterpret_cast<{ height?: DimensionValue; resizeMode?: string }>(StyleSheet.flatten(props.style) ?? {});
	const image_height = props.height ?? flat_style.height ?? 0;

	const { colors } = usePTheme();
	const [source, set_source] = useState<Artwork | undefined | null>(props.source);

	const fade_end_color = hexToRgba(props.fade?.color ?? colors.background, props.fade?.end_opacity ?? 1);
	const fade_middle_color = hexToRgba(props.fade?.color ?? colors.background, props.fade?.middle_opacity ?? 0.2);

	function update_source() {
		if (typeof props.source === "number" || props.source === undefined || props.source === null) {
			set_source(props.source);
		} else if (typeof props.source === "string" && (props.source.includes("https:") || props.source.includes("http:"))) {
			set_source(props.source);
		} else if (typeof props.source === "string") {
			run_throttled_fs_check(async () => {
				if (typeof props.source !== "string") return;
				const source_file_info = await fs().get_info(props.source);
				if (!source_file_info.exists || source_file_info.is_directory) {
					set_source(undefined);
				} else {
					set_source(props.source);
				}
			});
		}
	}

	const source_key = typeof props.source === "object" && props.source !== null ? JSON.stringify(props.source) : props.source;
	useEffect(() => {
		update_source();
	}, [source_key]);

	const recycling_key = typeof source === "string" ? source : undefined;
	const content_fit = to_content_fit(props.resizeMode ?? flat_style.resizeMode);

	const base_image = (
		<Image
			source={reinterpret_cast<string | number | { uri: string }>(resolved_artwork(source))}
			style={reinterpret_cast<ExpoImageStyle>(props.style)}
			contentFit={content_fit}
			cachePolicy="memory-disk"
			recyclingKey={recycling_key}
			transition={0}
			blurRadius={props.blurRadius}
		/>
	);

	const image_with_tint = props.tint ? (
		<>
			{base_image}
			<View style={{ ...reinterpret_cast<ViewStyle>(props.style), opacity: props.tint.opacity, position: "absolute", backgroundColor: props.tint.color }} />
		</>
	) : (
		base_image
	);

	const inner = (
		<>
			{image_with_tint}
			{props.blur ? <BlurView {...props.blur} style={{ pointerEvents: "box-none", position: "absolute", bottom: 0, height: image_height, width: "100%" }} /> : null}
			{props.fade ? <LinearGradient colors={["transparent", fade_middle_color, fade_end_color]} style={{ pointerEvents: "box-none", position: "absolute", bottom: 0, height: props.fade.percent, width: "100%" }} /> : null}
		</>
	);

	return props.useview ? <View style={reinterpret_cast<ViewStyle>(props.style)}>{inner}</View> : inner;
}
