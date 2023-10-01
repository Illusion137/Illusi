import axios from "axios"; //HTTP Request Library
import SearchYouTube, { GenerateNewUID, decodeHex, durationToInt } from "./IllusiveSearch";
import * as SQLActions from "../../SQLActions";
import * as Prefs from "../../Preferences";
import req from "./Req";
import { getAmazonMusicAmznMusicData, getAmazonMusicShowHomeData, getSpotifyInitialData } from "./IllusiveAccountPlaylistFinder";

function getYTPlaylistIdFromURL(url){
    const idRegex = /(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=/
    return url.replace(idRegex, '')
}

function getRandomIndex(max) {
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - 0) + 0); // The maximum is exclusive and the minimum is inclusive
}

async function getProxyList(){
    try {
        const IPPortRegex = /((\d+\.)+(\d+)):(\d+)/g
        let body = (await axios({'method': 'GET', 'url': "https://www.us-proxy.org/"})).data
    
        let matchedProxies = [...body.matchAll(IPPortRegex)]
        let proxies = [];
        for(let i = 0; i < matchedProxies.length; i++){
            proxies.push({
                ip: matchedProxies[i][1],
                port: parseInt(matchedProxies[i][4]),
            })
        }
        return proxies
        
    } catch (error) {
        return [];
    }
}

export async function getMusiPlaylist(url){
    const playlistParam = url.replace('https://feelthemusi.com/playlist/','')
    const response = await fetch(`https://feelthemusi.com/api/v4/playlists/fetch/${playlistParam}`);
    
    const json = await response.json();
    let parsed = JSON.parse(json.success.data)
    
    for(let i = 0; i < parsed.data.length; i++){
        parsed.data[i]['saved'] = false;
        if(await SQLActions.checkIfVideoIdExists(parsed.data[i].video_id))
            parsed.data[i]['saved'] = true;
    }
    return parsed;
}

export async function getYouTubeInitialData(url = 'https://www.youtube.com/'){
    try {
        const innertubeApiKeyRegex = /"INNERTUBE_API_KEY": ?\"(.+?)\"/s;
        const innertubeContextRegex = /INNERTUBE_CONTEXT": ?({.+?}})/s;
        let config = {
			method: 'get',
			maxBodyLength: Infinity,
			url: url,
			headers: { 
			  'authority': 'www.youtube.com', 
			  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
			  'accept-language': 'en-US,en;q=0.9', 
			  'cache-control': 'max-age=0', 
			  'Cookies': Prefs.prefs.external_services.youtube_cookies,  
			  'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"', 
			  'sec-ch-ua-arch': '"x86"', 
			  'sec-ch-ua-bitness': '"64"', 
			  'sec-ch-ua-full-version': '"117.0.5938.92"', 
			  'sec-ch-ua-full-version-list': '"Google Chrome";v="117.0.5938.92", "Not;A=Brand";v="8.0.0.0", "Chromium";v="117.0.5938.92"', 
			  'sec-ch-ua-mobile': '?0', 
			  'sec-ch-ua-model': '""', 
			  'sec-ch-ua-platform': '"Windows"', 
			  'sec-ch-ua-platform-version': '"15.0.0"', 
			  'sec-ch-ua-wow64': '?0', 
			  'sec-fetch-dest': 'document', 
			  'sec-fetch-mode': 'navigate', 
			  'sec-fetch-site': 'none', 
			  'sec-fetch-user': '?1', 
			  'service-worker-navigation-preload': 'true', 
			  'upgrade-insecure-requests': '1', 
			  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', 
			  'x-client-data': 'CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJahywEI85jNAQiFoM0BCNy9zQEI38TNAQi5ys0BCMXRzQEI1NTNAQjM1s0BCOLWzQEI+cDUFRi60s0BGOuNpRc='
			}
		  };

        const response = await axios(config);
        const responseData = response.data;

        const INNERTUBE_API_KEY = innertubeApiKeyRegex.exec(responseData)[1]
        let INNERTUBE_CONTEXT = JSON.parse(innertubeContextRegex.exec(responseData)[1].replaceAll(/\n\s+/g,''))

        INNERTUBE_CONTEXT['adSignalsInfo'] = {'params':[
            {
                "key": "dt",
                "value": "1696043921913"
            },
            {
                "key": "flash",
                "value": "0"
            },
            {
                "key": "frm",
                "value": "0"
            },
            {
                "key": "u_tz",
                "value": "-420"
            },
            {
                "key": "u_his",
                "value": "5"
            },
            {
                "key": "u_h",
                "value": "1440"
            },
            {
                "key": "u_w",
                "value": "2560"
            },
            {
                "key": "u_ah",
                "value": "1392"
            },
            {
                "key": "u_aw",
                "value": "2560"
            },
            {
                "key": "u_cd",
                "value": "24"
            },
            {
                "key": "bc",
                "value": "31"
            },
            {
                "key": "bih",
                "value": "1283"
            },
            {
                "key": "biw",
                "value": "1511"
            },
            {
                "key": "brdim",
                "value": "0,0,0,0,2560,0,2560,1392,1528,1283"
            },
            {
                "key": "vis",
                "value": "1"
            },
            {
                "key": "wgl",
                "value": "true"
            },
            {
                "key": "ca_type",
                "value": "image"
            }
        ]}
        INNERTUBE_CONTEXT['request']['consistencyTokenJars'] = []
        INNERTUBE_CONTEXT['request']['internalExperimentFlags'] = [
            {
                "key": "force_enter_once_in_webview",
                "value": "true"
            }
        ]

        let returnData = {
            'INNERTUBE_API_KEY': INNERTUBE_API_KEY, 
            'INNERTUBE_CONTEXT': INNERTUBE_CONTEXT, 
            'data': responseData};
        return returnData;
    } catch (error) {
        console.log(error)
        return null;
    }
}

async function getYoutubePlaylistContinuation(innertube_api_key, continuationKey, context, url, trackingParams){
    try {
        let videos = [];
        let headers = { 
            'authority': 'www.youtube.com', 
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
            'accept-language': 'en-US,en;q=0.9', 
            'cache-control': 'max-age=0', 
            'Cookies': Prefs.prefs.external_services.youtube_cookies,  
            'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"', 
            'sec-ch-ua-arch': '"x86"', 
            'sec-ch-ua-bitness': '"64"', 
            'sec-ch-ua-full-version': '"117.0.5938.92"', 
            'sec-ch-ua-full-version-list': '"Google Chrome";v="117.0.5938.92", "Not;A=Brand";v="8.0.0.0", "Chromium";v="117.0.5938.92"', 
            'sec-ch-ua-mobile': '?0', 
            'sec-ch-ua-model': '""', 
            'sec-ch-ua-platform': '"Windows"', 
            'sec-ch-ua-platform-version': '"15.0.0"', 
            'sec-ch-ua-wow64': '?0', 
            'sec-fetch-dest': 'document', 
            'sec-fetch-mode': 'navigate', 
            'sec-fetch-site': 'none', 
            'sec-fetch-user': '?1', 
            'service-worker-navigation-preload': 'true', 
            'upgrade-insecure-requests': '1', 
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', 
            'x-client-data': 'CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJahywEI85jNAQiFoM0BCNy9zQEI38TNAQi5ys0BCMXRzQEI1NTNAQjM1s0BCOLWzQEI+cDUFRi60s0BGOuNpRc='
        };
        let postURL = `https://www.youtube.com/youtubei/v1/browse?key=${innertube_api_key}&prettyPrint=false`
        let postData = {
            "context": {
                "client": {
                    "hl": context.client.hl,
                    "gl": context.client.gl,
                    "remoteHost": context.client.remoteHost,
                    "deviceMake": "",
                    "deviceModel": "",
                    "visitorData": context.client.visitorData,
                    "userAgent": context.client.userAgent,
                    "clientName": context.client.clientName,
                    "clientVersion": context.client.clientVersion,
                    "osName": context.client.osVersion,
                    "osVersion": context.client.osVersion,
                    "originalUrl": url,
                    "platform": context.client.platform,
                    "clientFormFactor": context.client.clientFormFactor,
                    "configInfo": context.client.configInfo,
                    "userInterfaceTheme": "USER_INTERFACE_THEME_DARK",
                    "timeZone": context.client.timeZone,
                    "browserName": context.client.browserName,
                    "browserVersion": context.client.browserVersion,
                    "acceptHeader": context.client.acceptHeader,
                    "deviceExperimentId": context.client.deviceExperimentId,
                    "screenWidthPoints": 632,
                    "screenHeightPoints": 913,
                    "screenPixelDensity": 1,
                    "screenDensityFloat": 1,
                    "utcOffsetMinutes": -420,
                    "connectionType": "CONN_CELLULAR_4G",
                    "memoryTotalKbytes": "8000000",
                    "mainAppWebInfo": {
                        "graftUrl": url,
                        "pwaInstallabilityStatus": "PWA_INSTALLABILITY_STATUS_CAN_BE_INSTALLED",
                        "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER",
                        "isWebNativeShareAvailable": true
                    }
                },
                "user": {
                    "lockedSafetyMode": false
                },
                "request": {
                    "useSsl": true,
                    "consistencyTokenJars": [
                        {
                            "encryptedTokenJarContents": []
                        }
                    ],
                    "internalExperimentFlags": [
                        {
                            "key": "force_enter_once_in_webview",
                            "value": "true"
                        }
                    ]
                },
                "clickTracking": {
                    "clickTrackingParams": "CEQQ7zsYACITCO70-p291IEDFXBPTAgdLmwCgg=="
                },
            },
            "continuation": continuationKey
        }
        console.log(postURL)
        console.log(postData)

		let body = await axios({'method': 'POST', 'url': postURL, 'headers': headers, 'data': postData})
        let contents = body.data;
        console.log(JSON.stringify(contents))
        let continuationTokenGood = false;
        let continutationToken = undefined;
        let continuationItems = undefined;
        try {
            continuationItems = contents.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
            continutationToken = continuationItems[continuationItems.length-1].continuationItemRenderer.continuationEndpoint.continuationCommand.token;
            continuationTokenGood = true;
        } catch (error) {
        }

        let playlistVideoRenderers = continuationItems.slice(0,continuationItems.length-1)

        for (let i = 0; i < playlistVideoRenderers.length-1; i++){
            try {
                let video = playlistVideoRenderers[i];
                videos.push({
                    'video_id': video.playlistVideoRenderer.videoId,
					'video_name': video.playlistVideoRenderer.title.runs[0].text,
					'video_creator': video.playlistVideoRenderer.shortBylineText.runs[0].text,
					'video_duration': durationToInt(video.playlistVideoRenderer.lengthText.accessibility.accessibilityData.label),
                })
            } catch (error) {
            }
        }

        if(continuationTokenGood){
            videos = videos.concat(await getYoutubePlaylistContinuation(innertube_api_key, continutationToken, client));
        }

        return videos

    } catch (error) {
        console.log(error)
        return []
    }
}

export async function getYoutubePlaylist(url){
    try{
        let body;
        let continue_ = true;

		let videos = []
		
        let initialData = await getYouTubeInitialData(url);
        if(initialData === null){
            throw new Error("YouTube Initial Data is null")
        }

		const apikey = initialData.INNERTUBE_API_KEY
        const clientKey = initialData.INNERTUBE_CONTEXT

		const dataRegex  = /var ytInitialData ?= ?\'(.+?)\';<\/script>/gs
		const data2Regex  = /var ytInitialData ?= ?({.+?});<\/script>/gs
        // const continuationTokenRegex = /continuationCommand.+?:\\x22(.+?)\\x22,/
        const trackingParamsRegex = /"clickTrackingParams": ?"(.+?)"/s
        const continuationTokenRegex = /continuationCommand.+?:"(.+?)",/s
        const titleRegex = /<title>(.+?) - YouTube<\/title>/
        // console.log(decodeHex( initialData.data))
        let raw;
        try {
            raw = dataRegex.exec(initialData.data)[1]
            raw = decodeHex(raw)
        } catch (error) {
            raw = data2Regex.exec(initialData.data)[1]
        }

        let continuationToken;
        try {
            continuationToken = continuationTokenRegex.exec(initialData.data)[1]
        } catch (error) {
            continue_ = false;
        }

		const title = titleRegex.exec(initialData.data)[1]

		let data = JSON.parse(raw.replaceAll(/\n\s+/g,''))
		data.apikey = apikey

		let playlistVideoRenderers = [...JSON.stringify(data).matchAll(/({"playlistVideoRenderer.+?"}]}}})[^\]]/g)]
        
        for (let i = 0; i < playlistVideoRenderers.length-1; i++){
            try {
                let parsedVideo = JSON.parse(playlistVideoRenderers[i][1])
                videos.push({
                    'video_id': parsedVideo.playlistVideoRenderer.videoId,
					'video_name': parsedVideo.playlistVideoRenderer.title.runs[0].text,
					'video_creator': parsedVideo.playlistVideoRenderer.shortBylineText.runs[0].text,
					'video_duration': durationToInt(parsedVideo.playlistVideoRenderer.lengthText.accessibility.accessibilityData.label),
                })
            } catch (error) {
            }
        }
        
        if(continue_){
            let continuedVideos = await getYoutubePlaylistContinuation(apikey, continuationToken, clientKey, url, trackingParamsRegex.exec(raw)[0]);
            videos = videos.concat(continuedVideos);
        }

        for(let i = 0; i < videos.length; i++){
            videos[i]['saved'] = false;
            if(await SQLActions.checkIfVideoIdExists(videos[i].video_id))
                videos[i]['saved'] = true;
        }

        return {'data': videos, 'title': title};
	}
	catch(error){
        console.log(error)
        return {'data': [], 'title': null};
	}
}
function parseYTMusicDuration(textDur){
    let textDurSplit = textDur.split(':')
    let j = 0;
    let duration = 0;
    for(let i = textDurSplit.length-1; i >= 0; i--){
        duration += (parseInt(textDurSplit[i]) * Math.pow(60,j))
        j++;
    }
    return duration
}
async function getYoutubeMusicPlaylistContinuation(ogURL,client ,innertube_api_key, continuation, itct){
    try {
        let videos = [];
        let postURL = `https://music.youtube.com/youtubei/v1/browse?ctoken=${continuation}&continuation=${continuation}&type=next&itct=${itct}&key=${innertube_api_key}&prettyPrint=false`
        let postData = {"context": client}

		let contents = (await axios({'method': 'POST', 'url': postURL, 'headers': {
            'Access-Control-Allow-Origin' : '*',
            'x-youtube-client-name': 1,
            'x-youtube-client-version': '2.20200911.04.00',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
            "Cookies": Prefs.prefs.external_services.youtube_music_cookies
        }, 'data': postData})).data
        let continuationTokenGood = false;
        let continutationToken = undefined;
        let continuationItems = undefined;
        try {
            continuationItems = contents.continuationContents.musicPlaylistShelfContinuation.contents;
            continutationToken = contents.continuationContents.musicPlaylistShelfContinuation.continuations[0].nextContinuationData.continuation;
            continuationTokenGood = true;
        } catch (error) {
        }

        for (const track of continuationItems){
            try {
                let video_duration;
                try {
                    video_duration = track.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text
                } catch (error) {
                    video_duration = track.musicResponsiveListItemRenderer.flexColumns[3].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
                }
                videos.push({
                    'video_id':       track.musicResponsiveListItemRenderer.playlistItemData.videoId,
					'video_name':     track.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
					'video_creator':  track.musicResponsiveListItemRenderer.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
					'video_duration': parseYTMusicDuration(video_duration),
                })
            } catch (error) {
            }
        }

        if(continuationTokenGood){
            videos = videos.concat(await getYoutubeMusicPlaylistContinuation(ogURL, client, innertube_api_key, continutationToken));
        }
        return videos

    } catch (error) {
        console.log(error)
    }
}

//REQUIRES COOKIES
export async function getYoutubeMusicPlaylist(url){
    if(!Prefs.hasYouTubeMusicCookies())
        return undefined;
    try 
    {
        continue_ = true
        let response = (await axios({"method": 'GET', 'url': url,
            'headers': {
                'Access-Control-Allow-Origin' : '*',
				'x-youtube-client-name': 1,
				'x-youtube-client-version': '2.20200911.04.00',
				'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
                "Cookies": Prefs.prefs.external_services.youtube_music_cookies
            },
            'withCredentials': true
        })).data;
        const initialDataRegex = /initialData\.push.+?initialData\.push.+?data: '(.+?)'.+?ytcfg.set/gs;
        const innertubeApiKeyRegex = /\"INNERTUBE_API_KEY\": ?\"(.+?)\"/;
        const innertubeContextRegex = /\"INNERTUBE_CONTEXT\": ?({.+?}}).+?INNERTUBE_CONTEXT_CLIENT_NAME/s;
        const continuationAndTrackingRegex = /nextContinuationData\\x22:\\x7b\\x22continuation\\x22:\\x22(.+?)\\x22,\\x22clickTrackingParams\\x22:\\x22(.+?)\\x22/s;

        let decodedResponse = decodeHex(response)
        
        //[1].replaceAll(/\n\s+/g,'')
        const INNERTUBE_API_KEY = innertubeApiKeyRegex.exec(decodedResponse)[1];
        const INNERTUBE_CONTEXT = JSON.parse(innertubeContextRegex.exec(decodedResponse)[1].replaceAll(/\n\s+/g,''));
        
        let continuationAndTracking;
        let CONTINUATION;
        let TRACKING;
        try {
            continuationAndTracking = continuationAndTrackingRegex.exec(response)
    
            CONTINUATION = continuationAndTracking[1];
            TRACKING = continuationAndTracking[2];
        } catch (error) {
            continue_ = false
        }

        let initialData = decodeHex(initialDataRegex.exec(response)[1]);
        
        initialData = JSON.parse(initialData)
        let initialDataTracks = initialData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents

        const playlistTitle = initialData.header.musicEditablePlaylistDetailHeaderRenderer.header.musicDetailHeaderRenderer.title.runs[0].text
        let tracks = [];
        
        for(const track of initialDataTracks){
            try {
                tracks.push({
                    'video_id': track.musicResponsiveListItemRenderer.playlistItemData.videoId,
                    'video_name': track.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
                    'video_creator': track.musicResponsiveListItemRenderer.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
                    'video_duration': parseYTMusicDuration(track.musicResponsiveListItemRenderer.flexColumns[3].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text),
                })
            } catch (error) {
                // console.log(error)
            }
        }
        tracks = tracks.concat(await getYoutubeMusicPlaylistContinuation(url,INNERTUBE_CONTEXT, INNERTUBE_API_KEY, CONTINUATION, TRACKING))

        return {'data': tracks, 'title': playlistTitle}
    } catch (error) {
        console.log(error);
        return undefined;
    }

}

export async function getSpotifyPlaylist(url){
    try {
        const playlistUID = url.replace(/https:\/\/open\.spotify\.com\/(album|playlist)\//,'')

        const limit = Prefs.prefs.settings.spotify_playlist_limit

        let initialData = await getSpotifyInitialData(url);
        let clientToken = initialData.clientToken
        let sessionJson = initialData.session

        let playlistData;
        let tracks = [];

        if(url.includes("album")){
            playlistData = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=getAlbum&variables=%7B%22uri%22%3A%22spotify%3Aalbum%3A${playlistUID}%22%2C%22locale%22%3A%22%22%2C%22offset%22%3A0%2C%22limit%22%3A${limit}%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2246ae954ef2d2fe7732b4b2b4022157b2e18b7ea84f70591ceb164e4de1b5d5d3%22%7D%7D`, {
                "headers": {
                  "accept": "application/json",
                  "accept-language": "en",
                  "app-platform": "WebPlayer",
                  "authorization": "Bearer "+ sessionJson.accessToken,
                  "client-token": clientToken.granted_token.token,
                  "content-type": "application/json;charset=UTF-8",
                  "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-site",
                  "spotify-app-version": "1.2.21.625.gab84de47",
                  "Referer": "https://open.spotify.com/",
                  "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": null,
                "method": "GET"
            });
            playlistData = await playlistData.json();
            let trackItems = playlistData.data.albumUnion.tracks.items;
    
            for(let i = 0; i < trackItems.length; i++){
                tracks.push({
                    // 'video_id': trackItems[i].uid,
                    'video_name': trackItems[i].track.name,
                    'video_creator': trackItems[i].track.artists.items[0].profile.name,
                    // 'video_duration': Math.floor(trackItems[i].track.duration.totalMilliseconds / 1000),
                })
            }
        } else if(url.includes("playlist")){
            playlistData = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=%7B%22uri%22%3A%22spotify%3Aplaylist%3A${playlistUID}%22%2C%22offset%22%3A0%2C%22limit%22%3A${limit}%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2273a3b3470804983e4d55d83cd6cc99715019228fd999d51429cc69473a18789d%22%7D%7D`, {
                "headers": {
                  "accept": "application/json",
                  "accept-language": "en",
                  "app-platform": "WebPlayer",
                  "authorization": "Bearer "+ sessionJson.accessToken,
                  "client-token": clientToken.granted_token.token,
                  "content-type": "application/json;charset=UTF-8",
                  "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-site",
                  "spotify-app-version": "1.2.21.628.g8daa917a",
                  "Referer": "https://open.spotify.com/",
                  "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": null,
                "method": "GET"
              });
            playlistData = await playlistData.json();
            let trackItems = playlistData.data.playlistV2.content.items;
    
            for(let i = 0; i < trackItems.length; i++){
                tracks.push({
                    'video_name': trackItems[i].itemV2.data.name,
                    'video_creator': trackItems[i].itemV2.data.artists.items[0].profile.name,
                })
            }
        }
        
        let proxies = await getProxyList();
        
        async function searchYT(title, artist, proxy = null){
            let search_query = `${artist} - ${title}`;
            let ytSearchResult = await SearchYouTube(search_query, 0, proxy)
            return ytSearchResult.data[0]
        }
        
        const ytTracks = [];
        for(let i = 0; i < tracks.length; i++){
            ytTracks.push(
                searchYT(tracks[i].video_name, tracks[i].video_creator, proxies[getRandomIndex(proxies.length)])
            )
        }
        let results = await Promise.all(ytTracks)

        return {
            'data': results,
            'title': playlistData.data?.albumUnion?.name || playlistData.data?.playlistV2?.name
        }

    } catch (error) {
        return { 'data': [], 'title': undefined }
    }

}

export async function getAmazonMusicPlaylist(url){
    try {
        let amznMusic = await getAmazonMusicAmznMusicData(url);
                            
        let trimmedURL = url.replace("https://",'').replace("music.amazon.com",'');
    
        let playlistData = await getAmazonMusicShowHomeData(amznMusic, url);
    
        let templateListIndex = -1;
        for(let i = 0; i < playlistData.methods.length; i++){
            if(playlistData.methods[i].interface == "TemplateListInterface.v1_0.CreateAndBindTemplateMethod"){
                templateListIndex = i;
            }
        }
    
        let amznTrackData = playlistData.methods[templateListIndex].template.widgets[0].items;
        const tracks = [];
    
        for(let i = 0; i < amznTrackData.length; i++){
            tracks.push({
                'id': amznTrackData[i].id,
                'video_name': amznTrackData[i].primaryText,
                'video_creator': amznTrackData[i].secondaryText1,
            })
        }
        let proxies = await getProxyList();
            
        async function searchYT(title, artist, proxy = null, amznTData = null){
            let search_query = `${artist} - ${title}`;
            let ytSearchResult = await SearchYouTube(search_query, 0, proxy)
            let result = ytSearchResult.data[0]
            result['exid'] = JSON.stringify([
                {"service": "amazon", "exid": amznTData}
            ])
            return ytSearchResult.data[0]
        }
        
        const ytTracks = [];
        for(let i = 0; i < tracks.length; i++){
            ytTracks.push(
                searchYT(tracks[i].video_name, tracks[i].video_creator, proxies[getRandomIndex(proxies.length)], 
                {"id": tracks[i].id,
                "title": tracks[i].video_name,
                "artist": tracks[i].video_creator})
            )
        }
        let results = await Promise.all(ytTracks)
    
        return {data: results, title: playlistData.methods[templateListIndex].template.headerImageAltText}
      } catch (error) {
        return {data: [], title: null}
      }
}