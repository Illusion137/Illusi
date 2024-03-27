import axios from "axios"; //HTTP Request Library
import * as Prefs from "../../Preferences";
import { Alert } from "react-native";

function decodeHex(hex: string) {
	return hex.replace(/\\x22/g, '"').replace(/\\x7b/g, '{').replace(/\\x7d/g, '}').replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x3b/g, ';').replace(/\\x3d/g, '=').replace(/\\x27/g, '\'').replace(/\\\\/g, 'doubleAntiSlash').replace(/\\/g, '').replace(/doubleAntiSlash/g, '\\')
  }

export function getYTPlaylistIdFromURL(url: string){
    const idRegex = /(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=/
    return url.replace(idRegex, '')
}

export async function getAllYoutubePlaylistsFromAccount(){
    try {
        let response = (await axios({'url': "https://www.youtube.com/feed/library", 'method': 'GET', 'headers': {
            'Cookies': Prefs.prefs.external_services.youtube_cookies
        }})).data
        response = decodeHex(response);

        const ytInitialDataRegex = /var ytInitialData = (.+?);.+?<\/script>/gs;
        let ytInitialDataStr = ytInitialDataRegex.exec(response)[1]
        ytInitialDataStr = ytInitialDataStr.replaceAll(/\n\s+/g,'')
        ytInitialDataStr = JSON.stringify(ytInitialDataStr)
        ytInitialDataStr = ytInitialDataStr.slice(2, ytInitialDataStr.length - 2)
        const ytInitialData = JSON.parse(decodeHex(ytInitialDataStr));
        
        let playlistNamesData = ytInitialData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[2].shelfRenderer.content.verticalListRenderer.items
        // console.log(JSON.stringify(playlistNamesData))
        let playlistNames = new Map();
        for(const playlistName of playlistNamesData){
            try {
                playlistNames.set(playlistName.compactPlaylistRenderer.title.runs[0].text, playlistName.compactPlaylistRenderer.shareUrl)
            } catch (error) {
                // console.log(error)
            }
        }
        if(playlistNames.size == 0 || playlistNames == undefined)
            return undefined;
        return playlistNames

    } catch (error) {
        Alert.alert("Account Playlist Finder Error:", error)
        return undefined;
    }
}
export async function getAllYTMusicPlaylistsFromAccount(){
    try {        
        let dataMap = await getAllYoutubePlaylistsFromAccount();
        let newMap = new Map();
        const keys = [...dataMap.keys()];
        for(const key of keys){
            let value = `https://music.youtube.com/playlist?list=${getYTPlaylistIdFromURL(dataMap.get(key))}`;
            if(value.slice(value.length-2, value.length) == 'LL') {
                value = 'https://music.youtube.com/playlist?list=LM';
            }
            newMap.set(key, value)
        }
        return newMap;
    } catch (error) {
        console.log(error)
    }
}

export async function getSpotifyInitialData(url: string){
    try {
        let headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            'Access-Control-Allow-Origin' : '*',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            "Cookies": Prefs.prefs.external_services.spotify_cookies
        }

        const body = (await axios({'method': 'GET', 'url': url, 'headers': headers})).data

        const sessionRegex = /<script id="session" data-testid="session" type="application\/json">(.+?)<\/script>/is
        let session = sessionRegex.exec(body)[1]

        let sessionJson = JSON.parse(session)
        
        let clientToken = await fetch("https://clienttoken.spotify.com/v1/clienttoken", {
            "headers": {
              "accept": "application/json",
              "accept-language": "en-US,en;q=0.9",
              "content-type": "application/json",
              "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-site",
              "Referer": "https://open.spotify.com/",
              "Referrer-Policy": "strict-origin-when-cross-origin",
              "Cookies": Prefs.prefs.external_services.spotify_cookies
            },
                "body": "{\"client_data\":{\"client_version\":\"1.2.21.625.gab84de47\",\"client_id\":\"" + sessionJson.clientId + "\",\"js_sdk_data\":{\"device_brand\":\"unknown\",\"device_model\":\"unknown\",\"os\":\"windows\",\"os_version\":\"NT 10.0\",\"device_id\":\"null\",\"device_type\":\"computer\"}}}",
                "method": "POST"
        });
        clientToken = await clientToken.json();
        return {'session': sessionJson, 'clientToken': clientToken as any};
    } catch (error) {
        Alert.alert("Spotify Initial Error:", error)
    }
}

export async function getAllSpotifyPlaylistsFromAccount(){
    try {
        let initialData = await getSpotifyInitialData("https://open.spotify.com/");
        let clientToken = initialData.clientToken
        let sessionJson = initialData.session
    
        const limit = Prefs.prefs.settings.spotify_library_limit
    
        let response = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=libraryV3&variables=%7B%22filters%22%3A%5B%22Playlists%22%5D%2C%22order%22%3Anull%2C%22textFilter%22%3A%22%22%2C%22features%22%3A%5B%22LIKED_SONGS%22%2C%22YOUR_EPISODES%22%5D%2C%22limit%22%3A${limit}%2C%22offset%22%3A0%2C%22flatten%22%3Afalse%2C%22expandedFolders%22%3A%5B%5D%2C%22folderUri%22%3Anull%2C%22includeFoldersWhenFlattening%22%3Atrue%2C%22withCuration%22%3Afalse%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2217d801ba80f3a3d7405966641818c334fe32158f97e9e8b38f1a92f764345df9%22%7D%7D`, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en",
            "app-platform": "WebPlayer",
            "authorization": `Bearer ${sessionJson.accessToken}`,
            "client-token": clientToken.granted_token.token,
            "content-type": "application/json;charset=UTF-8",
            "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "spotify-app-version": "1.2.22.532.g9e6e8af9",
            "Referer": "https://open.spotify.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
        });
        let responseJson = await response.json();
        let playlistItems = responseJson.data.me.libraryV3.items
        let mappedData = new Map();
        for(const playlist of playlistItems){
            try {                
                let uri = playlist.item._uri
                let splitUri = uri.split(':')
                mappedData.set(playlist.item.data.name, `https://open.spotify.com/${splitUri[1]}/${splitUri[2]}`)
            } catch (error) {
            }
        }
        // mappedData.set()
        return mappedData;
    } catch (error) {
        console.log(error)
    }
}

export async function getAmazonMusicAmznMusicData(url: string){
    try {
        let amznMusic = {};
        {
            let headers = {"headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "Cookies": Prefs.prefs.external_services.amazon_music_cookies
              }};
            let configBody = ( await axios.get(url, {"headers": headers as any}) ).data
           
            const amznMusicRegex = /window.amznMusic = ({.+});/s
    
            //Fixing the shitty json
            let amznMusicText = amznMusicRegex.exec(configBody)[1]
            amznMusicText = amznMusicText.replaceAll(/\n\s+/g,'')
                                .replace("appConfig", "\"appConfig\"")
                                .replace("ssr:", "\"ssr\":")
                                .replace("isInContainerApp: true,","\"isInContainerApp\": true")
                                .replace("isInContainerApp: false,","\"isInContainerApp\": false")
            try {
                amznMusic = JSON.parse(amznMusicText);
            } catch (error) {
                Alert.alert("Amazon Initial JSON Error:",error)
                return null;
            }
        }
        return amznMusic
    } catch (error) {
        Alert.alert("Amazon Initial Error:", error)
    }
}

export async function getAmazonMusicShowHomeData(amznMusic: any, url: string){
    try {
        let trimmedURL = url.replace("https://",'').replace("music.amazon.com",'')
        let deeplink = {
            "interface": "DeeplinkInterface.v1_0.DeeplinkClientInformation",
            "deeplink": trimmedURL
        }
        let x_amzn_authentication = {
            "interface": "ClientAuthenticationInterface.v1_0.ClientTokenElement",
            "accessToken": amznMusic.appConfig.accessToken
        }
        let x_amzn_csrf = {
            "interface": "CSRFInterface.v1_0.CSRFHeaderElement",
            "token": amznMusic.appConfig.csrf.token,
            "timestamp": amznMusic.appConfig.csrf.ts,
            "rndNonce": amznMusic.appConfig.csrf.rnd
        }
        let headers = {
            "x-amzn-authentication": JSON.stringify(x_amzn_authentication),
            "x-amzn-device-model": "WEBPLAYER",
            "x-amzn-device-width": "1920",
            "x-amzn-device-family": "WebPlayer",
            "x-amzn-device-id": amznMusic.appConfig.deviceId,
            "x-amzn-user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
            "x-amzn-session-id": amznMusic.appConfig.sessionId,
            "x-amzn-device-height": "1080",
            "x-amzn-request-id": "dfefb1b8-4ae6-4d38-973b-a4964eefbd76",
            "x-amzn-device-language": amznMusic.appConfig.displayLanguage,
            "x-amzn-currency-of-preference": "USD",
            "x-amzn-os-version": "1.0",
            "x-amzn-application-version": amznMusic.appConfig.version,
            "x-amzn-device-time-zone": "America/Phoenix",
            "x-amzn-timestamp": amznMusic.appConfig.csrf.ts,
            "x-amzn-csrf": JSON.stringify(x_amzn_csrf),
            "x-amzn-music-domain": "music.amazon.com",
            "x-amzn-referer": "",
            "x-amzn-affiliate-tags": "",
            "x-amzn-ref-marker": "",
            "x-amzn-page-url": url,
            "x-amzn-weblab-id-overrides": "",
            "x-amzn-video-player-token": "",
            "x-amzn-feature-flags": "hd-supported,uhd-supported"
        }
        let body = JSON.stringify({"deeplink": JSON.stringify(deeplink), "headers": JSON.stringify(headers)})
        let showHomeData = await axios({'method': 'POST', 'url': "https://na.mesk.skill.music.a2z.com/api/showHome", 'headers': {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "text/plain;charset=UTF-8",
            "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://music.amazon.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            'data': body
        });
        return showHomeData.data
    } catch (error) {
        console.log(error)
    }
}
export function getXAmznAuth(amznMusic: any){
    return {
        "interface": "ClientAuthenticationInterface.v1_0.ClientTokenElement",
        "accessToken": amznMusic.appConfig.accessToken
    }
} 
export function getAmznCsrf(amznMusic: any){
    return {
        "interface": "CSRFInterface.v1_0.CSRFHeaderElement",
        "token": amznMusic.appConfig.csrf.token,
        "timestamp": amznMusic.appConfig.csrf.ts,
        "rndNonce": amznMusic.appConfig.csrf.rnd
    }
}
export function getAmznVideoPlayerToken(authHeader: any){
    return {
        "interface": authHeader.interface,
        "token": authHeader.token,
        "expirationMS": authHeader.expirationMS
    }
}
export function getAmznMusicHeaders(){
    return {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "text/plain;charset=UTF-8",
        "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "Referer": "https://music.amazon.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
}
export function getAmznMusicRequestHeaders(xAmznAuth: any, amznMusic: any, xAmznCsrf: any, xAmznVideoPlayerToken: any, playlistURL = "https://music.amazon.com/my/library"){
    return {
        "x-amzn-authentication": JSON.stringify(xAmznAuth),
        "x-amzn-device-model": "WEBPLAYER",
        "x-amzn-device-width": "1920",
        "x-amzn-device-family": "WebPlayer",
        "x-amzn-device-id": amznMusic.appConfig.deviceId,
        "x-amzn-user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "x-amzn-session-id": amznMusic.appConfig.sessionId,
        "x-amzn-device-height": "1080",
        "x-amzn-request-id": "449fef43-8891-44ab-896c-6ed4c9ec1e77",
        "x-amzn-device-language": amznMusic.appConfig.displayLanguage,
        "x-amzn-currency-of-preference": "USD",
        "x-amzn-os-version": "1.0",
        "x-amzn-application-version": amznMusic.appConfig.version,
        "x-amzn-device-time-zone": "America/Phoenix",
        "x-amzn-timestamp": amznMusic.appConfig.csrf.ts,
        "x-amzn-csrf": JSON.stringify(xAmznCsrf),
        "x-amzn-music-domain": "music.amazon.com",
        "x-amzn-referer": "",
        "x-amzn-affiliate-tags": "",
        "x-amzn-ref-marker": "",
        "x-amzn-page-url": playlistURL,
        "x-amzn-weblab-id-overrides": "",
        "x-amzn-video-player-token": JSON.stringify(xAmznVideoPlayerToken),
        "x-amzn-feature-flags": "hd-supported,uhd-supported"
    }
}
export function getAmazonMusicUserHash(){
    return {'level': 'SONIC_RUSH_MEMBER'}
}
export async function getAllAmazonMusicPlaylistsFromAccount(){
    try {
        let amznMusic = await getAmazonMusicAmznMusicData("https://music.amazon.com/my/library")
        let showHomeData = await getAmazonMusicShowHomeData(amznMusic, "https://music.amazon.com/my/library");

        let xAmznAuth = getXAmznAuth(amznMusic);
        let xAmznCsrf = getAmznCsrf(amznMusic);
        let authHeader = JSON.parse(showHomeData.methods[0].header);
        let xAmznVideoPlayerToken = getAmznVideoPlayerToken(authHeader);
        let rqHeaders = getAmznMusicRequestHeaders(xAmznAuth,amznMusic,xAmznCsrf,xAmznVideoPlayerToken);
        let userHash = getAmazonMusicUserHash();
        let requestPayload = {'headers': JSON.stringify(rqHeaders), 'userHash': JSON.stringify(userHash)};
        let showLibraryData = (await axios({'method': 'POST', 'url': "https://na.mesk.skill.music.a2z.com/api/showLibraryHome", 'headers': getAmznMusicHeaders(),
            'data': requestPayload
        })).data;
        let playlists = showLibraryData.methods[0].template.widgets[1].items
        let mappedData = new Map();
        for(let i = 0; i < playlists.length-1; i++){
            try {
                mappedData.set(
                    playlists[i].primaryText.observer.defaultValue.text, 
                    `https://music.amazon.com${playlists[i].primaryLink.deeplink}`
                )
            } catch (error) {
                // console.log(error)
            }
        }

        return mappedData;
      } catch (error) {
        Alert.alert("Amazon Playlist Finder Error", error)
        return {data: [], title: null}
      }
}