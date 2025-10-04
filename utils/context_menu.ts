import type { IconConfig, MenuAttributes, MenuElementConfig } from "react-native-ios-context-menu";
import type { ContextResolver } from "./context_resolver";
import type { ImageItemConfig, ImageResolvedAssetSource } from "react-native-ios-utilities";
import { Image } from "react-native";
import { is_empty } from "@common/utils/util";
import { Prefs } from "@illusive/prefs";
import type { Track } from "@illusive/types";
import { reinterpret_cast } from '../lib-origin/common/cast';
import { GLOBALS } from "@illusive/globals";

type Icon = ImageResolvedAssetSource|string;
function resolve_icon(icon?: Icon): IconConfig|ImageItemConfig|undefined{
    return typeof icon === "undefined" ? undefined : 
    typeof icon === "object" ?
        {
            iconType: 'REQUIRE',
            iconValue: icon,
        }
    : {
        type: 'IMAGE_SYSTEM',
        imageValue: {
            systemName: icon,
        },
    };
}
function base_menu_item<Keys extends string>(key: Keys, title: string, attributes?: () => MenuAttributes[]|undefined, icon?: Icon){
    return {
        actionKey: key,
        actionTitle: title,
        icon: resolve_icon(icon),
        menuAttributes: attributes?.()
    }
}
function menu_folder(title: string, items: MenuElementConfig[], icon?: Icon): MenuElementConfig{
    return {
        menuTitle: title,
        icon: resolve_icon(icon),
        menuItems: items
    };
}
function extract_menu_items<Keys extends string>(items: MenuElementConfig[], keys: Keys[]): MenuElementConfig[] {
    return items.filter(item => keys.includes(reinterpret_cast<{actionKey: Keys}>(item).actionKey));
}

const track_menu_item = (key: ContextResolver.TrackContextKeys, title: string, attributes?: () => MenuAttributes[]|undefined, icon?: Icon): MenuElementConfig => 
    base_menu_item<ContextResolver.TrackContextKeys>(key, title, attributes, icon);

const discord_app_icon = Image.resolveAssetSource(require("../assets/discord.png"));

export namespace TrackContextMenu {
    const track_all_functions = (track: Track) => {
        const is_saved = false;
        const is_playlist_saved = false;
        return [
            track_menu_item("track-push-discord", "Push Discord", () => is_empty(Prefs.get_pref('discord_webhook_url')) || !is_empty(track.imported_id) ? ['hidden'] : undefined, discord_app_icon),
            track.artists.length <= 1 ? 
                track_menu_item("track-view-artist", "View Artist", () => is_empty(track.artists[0].uri) ? ['hidden'] : undefined, "music.mic")
                :
                menu_folder("View Artists", 
                    track.artists.map((artist, i) => track_menu_item(`track-view-artist-${i}`, `View Artist - ${artist.name}`, () => is_empty(track.artists[i].uri) ? ['hidden'] : undefined, 'music.mic'))
                ),
            track_menu_item("track-view-album", "View Album", () => is_empty(track.album?.uri) ? ['hidden'] : undefined, 'list.bullet'),    
            track_menu_item("track-trim-media", "Trim Media", () => !is_empty(track.media_uri) ? ['hidden'] : undefined, 'timeline.selection'),    
            track_menu_item("track-view-info", "View Track Info", () => !is_saved? ['hidden'] : undefined, 'scope'),    
            track_menu_item("track-edit-info", "Edit Track Info", () => !is_saved? ['hidden'] : undefined, 'scope'),    
            track_menu_item("track-download-thumbnail", "Download Thumbnail", () => !is_empty(track.thumbnail_uri) || !is_saved ? ['hidden'] : undefined, 'arrow.down.circle'),    
            track_menu_item("track-upload-artwork", "Upload Artwork", () => !is_saved? ['hidden'] : undefined, 'photo.artframe'),    
            track_menu_item("track-download-media", "Download Media", () => !is_empty(track.media_uri) || !is_saved ? ['hidden'] : undefined, 'arrow.down.circle'),    
            track_menu_item("track-download-lyrics", "Download Lyrics", () => !is_empty(track.lyrics_uri) || !is_saved ? ['hidden'] : undefined, 'arrow.down.circle.dotted'),    
            track_menu_item("track-remove-artwork", "Remove Artwork", () => is_empty(track.thumbnail_uri) || !is_saved ? ['hidden'] : ['destructive'], 'trash'),    
            track_menu_item("track-delete-media", "Delete Media", () => is_empty(track.media_uri) || !is_saved ? ['hidden'] : ['destructive'], 'trash'),    
            track_menu_item("track-delete-lyrics", "Delete Lyrics", () => is_empty(track.lyrics_uri) || !is_saved ? ['hidden'] : ['destructive'], 'trash'),    
            track_menu_item("track-delete", "Delete", () => !is_saved ? !is_saved ? ['hidden'] : ['destructive'], 'trash'),
            track_menu_item("track-delete-playlist", "Delete From Playlist", () => !is_playlist_saved ? ['hidden'] : ['destructive'], 'trash'),
            track_menu_item("track-share-illusi", "Illusi Link", () => undefined, 'link'),    
            track_menu_item("track-share-original", "Source Link", () => undefined, 'link'),    
            track_menu_item("track-share-downloaded", "Downloaded File", () => is_empty(track.media_uri) ? ['hidden'] : undefined, 'folder.circle'),    
            track_menu_item("track-enqueue", "Enqueue Track", () => !GLOBALS.global_var.is_playing ? ['hidden'] : undefined, 'text.append'),   
            track_menu_item("track-play-next", "Play Next", () => !GLOBALS.global_var.is_playing ? ['hidden'] : undefined, 'text.insert') 
        ]
    }
    const extract_track_menu_items = () => extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions, );

    const track_extracted_attributes = extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions, );

    const menuconfig_more: MenuElementConfig[] = [
        {
            menuTitle: "Attributes",
            icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                    systemName: 'list.clipboard',
                },
            },
            menuItems: []
        },
        {
            menuTitle: "Offline",
            icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                    systemName: '',
                },
            },
            menuItems: []
        },
        {
            menuTitle: "Share",
            icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                    systemName: 'square.and.arrow.up',
                },
            },
            menuItems: []
        },
        {
            menuTitle: "Destructive",
            menuOptions: ['destructive'],
            icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                    systemName: 'trash',
                },
            },
            menuItems: []
        }
    ];
    const menuconfig_more_options: MenuElementConfig = 						{
        menuTitle: "More Options",
        menuItems: menuconfig_more,
        icon: {
            type: 'IMAGE_SYSTEM',
            imageValue: {
                systemName: 'option',
            },
        }
    };
}