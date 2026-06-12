import type { Track } from "@illusive/types";
import usePTheme from "./usePTheme";
import { is_empty } from "@common/utils/util";
import { SQLfs } from "@illusive/sql/sql_fs";
import ImageColors from "react-native-image-colors";
import { useCallback, useEffect, useMemo, useState } from "react";

interface TrackColors {
	track_colors?: {
		primary: string;
		secondary: string;
		background: string;
		detail: string;
	};
}
export default function useTrackColors(track: Track | undefined): TrackColors {
	const { colors } = usePTheme();
	const base_colors = {
		primary: colors.primary,
		secondary: colors.secondary,
		background: colors.background,
		detail: colors.primary_dark
	};
	const [track_colors, set_track_colors] = useState<TrackColors>({ track_colors: base_colors });

	// Prefer a downloaded / custom local thumbnail. Imported tracks resolve playback.artwork
	// to a generic placeholder icon, so sampling that gives nothing — but if a thumbnail was
	// downloaded we can still pull colours from the local file.
	const raw_artwork = useMemo(() => {
		if (!track) return undefined;
		if (!is_empty(track.thumbnail_uri)) {
			return track.thumbnail_uri!.includes(track.uid) ? SQLfs.thumbnail_directory(track.thumbnail_uri!) : SQLfs.custom_thumbnail_directory(track.thumbnail_uri!);
		}
		const artwork = track.playback?.artwork;
		if (typeof artwork === "string") return artwork;
		if (artwork && typeof artwork === "object") return artwork.uri;
		return undefined; // numeric placeholder icon — nothing real to sample
	}, [track?.uid, track?.thumbnail_uri]);

	const execute = useCallback(async () => {
		if (!raw_artwork) return;
		try {
			const artwork_colors = await ImageColors.getColors(raw_artwork);
			if (artwork_colors.platform === "ios") set_track_colors({ track_colors: artwork_colors });
		} catch {
			// keep base colours if extraction fails
		}
	}, [raw_artwork]);
	useEffect(() => {
		execute();
	}, [execute]);
	return track_colors;
}
