import AsyncStorage from '@react-native-async-storage/async-storage';
import * as GLOBALS from './globals';
import CookieManager from '@react-native-community/cookies';

export let prefs = getDefaultPrefs();
export class LinkedPlaylist{
    constructor(p){
        this.service_from = p.service_from || "";
        this.service_to = p.service_to || "";

        this.playlist_name_from = p.playlist_name_from || "";
        this.playlist_name_to = p.playlist_name_to || "";

        this.url_from = p.url_from || "";
        this.url_to = p.url_to || "";

        this.use_service_cookies = p.use_service_cookies || false;
        this.auto_fetch_on_startup = p.auto_fetch_on_startup || true;
        this.auto_fetch_on_startup_only_on_wifi = p.auto_fetch_on_startup_only_on_wifi || true;
    }
}

export async function isPrefsEmpty(){
    let prefs = await AsyncStorage.getItem("Prefs");
    if(prefs == null || prefs == undefined){
        return true;
    }
    return false;
}

export async function fetchPrefs(){
    if(await isPrefsEmpty())
        await resetPrefs();
    prefs = JSON.parse(await AsyncStorage.getItem("Prefs"));
}

function formatCookies(cookieData){
    //await CookieManager.get("https://m.youtube.com/");
    let cookieKeys = []
    let formatedCookies = ""
    for (var key in cookieData) {
        cookieKeys.push(key);
    }
    cookieKeys.forEach((key) => {
        formatedCookies += `${key}=${cookieData[key].value}; `;
    })
    formatedCookies = formatedCookies.slice(0, formatedCookies.length-2)

    return formatedCookies;

    // let response = await axios({'url': "https://www.youtube.com/playlist?list=LL", 'method': 'GET', 'headers': {
    //     'Cookies': formatedCookies
    // }})
}

export async function setCookies(unformatedCookies, service){
    let cookies = formatCookies(unformatedCookies);
    prefs.external_services[service] = cookies;
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}

export async function fetchAutoLinkedPlaylists(){
    await fetchPrefs();
    for(const linkedPlaylist of prefs.linker.linked_playlists){

    }
}
export function getExperimentalFeatureEnabled(feature){
    return prefs.settings.enable_experimental_features && prefs.experimental_features[feature]
}
function getDefaultPrefs(){
    return {
        'experimental_features':{
            'display_video_in_play_screen': true,
            'get_account_playlists_in_get_playlist': true,
            'enable_advanced_search': true,
            'enable_advanced_lyrics': true,
            'auto_cache_thumbnails': true,
            'smart_remove_cached_thumbnails': true,
        },
        'settings': {
            'search_service': 'YOUTUBE',
            'search_screen_service': 'YOUTUBE_MUSIC',
            'import_playlist_from_to': 'SELF',
            'download_queue_max_length': 3,
            'always_shuffle': true,
            'show_track_duration': false,
            'enable_experimental_features': false,
        },
        'sleep_timer_time': 0,
        'external_services': {
            'youtube_cookies' : '',
            'spotify_cookies' : '',
            'amazon_music_cookies' : '',
        },
        'linker': {
            'linked_playlists': []
        },
        'dark_mode': 'OFF',
        'themes': [
            {
                'name': 'default',
                'primary': '#462cc9',
                'background': '#0d1016',
                'card': '#131213',
                'text': '#ffffff',
                'subtext': '#8c939d',
                'border': '#222222',
                'notification': '#1313ff',
                'shelf': '#161B22',
                'tabInactive': '#cad1d8',
                'line': '#303040',
                'searchInput': '#404254',
                'searchPlaceholder': '#8080a0',
                'inactive': '#8080a0',
                'red': '#FF0000',
                'playingSong': '#141722',
                'playScreen': '#141722',
                'track': '#141722',
            },
            {
                'light': 'default'
            }
        ],
        'selected_theme': -1,
        'search': {
            'recent_searches': []
        }
    }
} 

export async function resetPrefs(){ 
    prefs = getDefaultPrefs();
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}

export async function deepComparePrefsSchemaAndUpdatePrefsSchema(){
    let defaultPrefs = getDefaultPrefs();
    let prefsCopy = prefs;
    prefs = defaultPrefs;
    
}