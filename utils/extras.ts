import type { Ionicons } from "@expo/vector-icons";
import { Prefs } from "@illusive/prefs";
import type { Href } from "expo-router";
import { Linking } from "react-native";

export type CustomComponents = "theme_selector";
interface ExtraNavigationBtnBase {
    title: string;
    icon: keyof (typeof Ionicons)["glyphMap"] | 'NONE';
    indev?: boolean;
}
type ExtraNavigationBtn = (ExtraNavigationBtnBase & { href: Href }) | (ExtraNavigationBtnBase & { on_press: () => any });
interface ExtraLayout {
    buttons: ExtraNavigationBtn[];
    custom_components?: CustomComponents[];
    description: string;
    condition?: () => boolean;
}

export const extras_layout: () => ExtraLayout[] = () => [
    {
        buttons: [
            {
                title: "Sync",
                href: "/extras/sync",
                icon: "sync-outline",
            }
        ],
        description: "Backup your music, transfer your playlists to other devices, recover deleted music and more"
    },
    {
        buttons: [
            {
                title: "SyncPlay",
                href: "/extras/sync-play",
                icon: "sync-circle-outline",
            },
            {
                title: "Samples",
                href: "/extras/samples",
                icon: "color-wand-outline",
            },
            {
                title: "Keep Delete",
                href: "/extras/keep-delete",
                icon: "heart-outline",
            }
        ],
        description: "The Tinder of your Music; Swipe left to delete tracks or swipe right to keep"
    },
    {
        buttons: [
            {
                title: "Settings",
                href: "/extras/settings",
                icon: "settings-outline"
            },
            {
                title: "Shuffler",
                href: "/extras/shuffler",
                icon: "shuffle-sharp"
            },
            {
                title: "Discord Integration",
                href: "/extras/discord",
                icon: "logo-discord"
            },
            {
                title: "External Services",
                href: "/extras/external-services",
                icon: "cog-outline"
            }
        ],
        description: "Sign into external Music Services services such as YouTube, YouTube Music, Spotify and Amazon Music for extra features."
    },
    {
        buttons: [
            {
                title: "Service Importer",
                href: "/extras/service-importer",
                icon: "albums-outline",
                indev: true
            },
            {
                title: "Linker",
                href: "/extras/linker",
                icon: "link-outline",
            },
            {
                title: "Track Sampler",
                href: "/extras/track-sampler",
                icon: "color-filter-outline",
                indev: true
            },
            {
                title: "Lyrics Finder",
                href: "/extras/lyrics-finder",
                icon: "text-outline",
            },
        ],
        description: "Hard Link playlist and other data from other Music Services. Automatically fetched on app startup."
    },
    {
        buttons: [
            {
                title: "Themes",
                href: "/extras/themes",
                icon: "brush-outline"
            }
        ],
        description: "Customize the look of Illusi"
    },
    {
        buttons: [
            {
                title: "Backpack",
                href: "/extras/backpack",
                icon: "bag-outline"
            }
        ],
        description: "Restore unavailable videos from Backpack"
    },
    {
        buttons: [
            {
                title: "Github",
                on_press: async () => await Linking.openURL("https://github.com/Illusion137"),
                icon: "logo-github"
            },
            {
                title: "Statistics",
                href: "/extras/statistics",
                icon: "stats-chart-outline"
            },
            {
                title: "Changelog",
                href: "/extras/changelog",
                icon: "list-outline"
            },
            {
                title: "Help",
                href: "/extras/help",
                icon: "help-outline",
                indev: true
            }
        ],
        description: "Get to know Illusi"
    },
    {
        buttons: [
            {
                title: "Developer",
                href: "/extras/dev",
                icon: "hammer-outline"
            },
            {
                title: "test_screen_view",
                href: "/extras/dev-test-screen",
                icon: "ticket-sharp"
            }
        ],
        description: "Developer Options :3",
        condition: () => Prefs.get_pref("dev_mode")
    }
];