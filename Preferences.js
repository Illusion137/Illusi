import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function getPrefs(){
    if(await isPrefsEmpty())
        await resetPrefs();
    return JSON.parse(await AsyncStorage.getItem("Prefs"));
}

export async function fetchAutoLinkedPlaylists(){
    let prefs = await getPrefs();
    for(const linkedPlaylist of prefs.linker.linked_playlists){

    }
}

export async function resetPrefs(){
    let prefs = {
        'settings': {
            'search_service': 'YOUTUBE',
            'import_playlist_from_to': 'SELF',
            'download_queue_max_length': 3,
            'always_shuffle': true,
            'show_track_duration': false,
            'enable_experimental_features': false,
        },
        'sleep_timer_time': 0,
        'external_services': {
            'youtube_cookies' : {},
            'spotify_cookies' : {},
            'amazon_music_cookies' : {},
        },
        'linker': {
            'linked_playlists': []
        },
        'dark_mode': 'OFF',
        'themes': [],
        'selected_theme': -1,
        'search': {
            'recent_searches': []
        }
    }

    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}

export async function setT(){
    
}