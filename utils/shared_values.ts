import { reinterpret_cast } from "@common/cast";
import type { CompactPlaylist } from "@illusive/types";

export const shared_values = { 
    cached_new_releases: reinterpret_cast<CompactPlaylist[]>([]),
};
