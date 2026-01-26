import { reinterpret_cast } from "@common/cast";
import type { Track } from "@illusive/types";
import usePTheme from "./usePTheme";
import { is_empty } from "@common/utils/util";
import ImageColors from "react-native-image-colors";
import { useCallback, useEffect, useState } from "react";

interface TrackColors {
    track_colors?: {
        primary: string,
        secondary: string,
        background: string,
        detail: string,
    }
}
export default function useTrackColors(track: Track|undefined): TrackColors {
    const { colors } = usePTheme();
    const base_colors = {
        primary: colors.primary,
        secondary: colors.secondary,
        background: colors.background,
        detail: colors.primary_dark,
    };
    const [track_colors, set_track_colors] = useState<TrackColors>({track_colors: base_colors});
    const raw_artwork = reinterpret_cast<string>(typeof track?.playback?.artwork === "object" ? track?.playback?.artwork.uri : track?.playback?.artwork);
    if(is_empty(track?.imported_id)){
        const execute = useCallback(async() => {
            ImageColors.getColors(raw_artwork).then(artwork_colors => {
                if(artwork_colors.platform === "ios")
                    set_track_colors({track_colors: artwork_colors});
            });
        }, [track.uid]);
        useEffect(() => {
            execute();
        }, []);
    }
    return track_colors;
}