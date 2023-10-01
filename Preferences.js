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

export function cookiesToJson(cookies){
    let cookieJson = {};
    let cookieSet = cookies.split('; ');
    cookieSet.forEach(cookie => {
        let cookieKeyValue = cookie.split('=')
        cookieJson[cookieKeyValue[0]] = cookieKeyValue[1]
    })
    return cookieJson;
}

export function updateCookies(cookies, newCookies){
    cookies = cookiesToJson(cookies)
    newCookies.forEach(cookie => {
        let cook = cookie.split(';')
        let cookieKeyValue = cookie[0].split('=')
        cookies[cookieKeyValue[0]] = cookieKeyValue[1]
    })
    return formatCookies(cookies);
}

export function hasYouTubeCookies(){
    return prefs.external_services.youtube_cookies.includes('LOGIN_INFO')
} 
export function hasYouTubeMusicCookies(){
    return prefs.external_services.youtube_music_cookies.includes('LOGIN_INFO')
}
export function hasSpotifyCookies(){
    return prefs.external_services.spotify_cookies.includes('sp_dc')
} 
export function hasAmazonCookies(){
    return prefs.external_services.amazon_music_cookies.includes('at-main')
} 

function formatCookies(cookieData){
    try {
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
    } catch (error) {
        
    }
}
function formatCookiesJson(cookieData){
    try {
        let formatedCookies = "";
        for(const cookie of Object.entries(cookieData)){
            formatedCookies += `${cookie[0]}=${cookie[1]}; `;
            formatedCookies = formatedCookies.slice(0, formatedCookies.length-2)
        }
        return formatedCookies;
    } catch (error) {
        
    }
}
export async function setCookiesJson(unformatedCookies, service){
    let cookies = formatCookiesJson(unformatedCookies);
    prefs.external_services[service] = cookies;
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
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
export async function setSettingsNumber(key, value){
    prefs.settings[plainTextToSnakeCase(key)] = value
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}
export async function setSettingsDropdown(){
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}
export async function setSettingsToggle(preKey, key, value){
    prefs[preKey][plainTextToSnakeCase(key)] = value
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}
export function getExperimentalFeatureEnabled(feature){
    return prefs.settings.enable_experimental_features && prefs.experimental_features[feature]
}

export const darkThemeDefault = {
    dark: true,
    colors: {
        primary: '#7400fe',
        secondary: '#fc00c9',
        background: '#0d1016',
        card: '#131213',
        text: '#ffffff',
        subtext: '#8c939d',
        border: '#222222',
        notification: '#1313ff',
        shelf: '#161B22',
        tabInactive: '#cad1d8',
        line: '#303040',
        searchInput: '#404254',
        searchPlaceholder: '#8080a0',
        inactive: '#8080a0',
        red: '#FF0000',
        green: '#00FF00',
        playingSong: '#141722',
        playScreen: '#141722',
        track: '#141722',
        highlightPressColor: '#bbaaff'
    },
}

function getDefaultPrefs(){
    return {
        'experimental_features':{
            'get_account_playlists_in_get_playlist': true,
            'auto_cache_thumbnails': true,
            'smart_remove_cached_thumbnails': true,
        },
        'settings': {
            'default_playlists_size': 200,
            'download_queue_max_length': 3,
            'spotify_library_limit': 20,
            'spotify_playlist_limit': 200,
            'always_shuffle': true,
            'only_play_downloaded': false,
            'show_track_duration': false,
            'ask_where_to_save': false,
            'edit_mode_disables_playing': false,
            'enable_dev_features': false,
            'enable_experimental_features': false,
        },
        'sleep_timer_time': 0,
        'external_services': {
            'youtube_cookies' : '',
            'youtube_music_cookies' : '',
            'spotify_cookies' : '',
            'amazon_music_cookies' : '',
        },
        'linker': {
            'linked_playlists': []
        },
        'search': {
            'recent_searches': []
        }
    }
} 
function plainTextToSnakeCase(text){
    text = text.replaceAll(' ','_').toLowerCase()
    return text
}
export function snakeCaseToPlainText(text){
    text = text.replaceAll('_',' ')
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
        words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    }
    return words.join(" ");
}

export async function resetPrefs(){ 
    prefs = getDefaultPrefs();
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}
export async function savePrefs(){
    await AsyncStorage.setItem('Prefs', JSON.stringify(prefs));
}

function recUpdatePrefsSchema(obj, prevObjs = []){
    let prefCopy = pref;

	let entries = Object.entries(obj);
	for(const entry of entries){
		console.log(entry[0], entry[1])
		if(typeof(entry[1]) == "object" && Object.entries(entry[1]).length > 0){
            let pObjs = []
            for(const o of prevObjs){
                pObjs.push(o)
            }
            pObjs.push(entry[0])
            recUpdatePrefsSchema(obj[entry[0]],pObjs)
		}
	}
}

export async function deepComparePrefsSchemaAndUpdatePrefsSchema(){
    // let defaultPrefs = getDefaultPrefs();
    // recUpdatePrefsSchema(defaultPrefs)
}