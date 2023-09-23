import axios from "axios"; //HTTP Request Library
import SearchYouTube, { GenerateNewUID, decodeHex, durationToInt } from "./IllusiveSearch";
import * as SQLActions from "../../SQLActions";

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

async function getYoutubePlaylistContinuation(innertube_api_key, continuationKey){
    try {

        let videos = [];
        headers = {
            headers: {
                'Access-Control-Allow-Origin' : '*',
                'x-youtube-client-name': 1,
                'x-youtube-client-version': '2.20200911.04.00',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
            }
        }
        let postURL = `https://www.youtube.com/youtubei/v1/browse?key=${innertube_api_key}&prettyPrint=false`
        let postData = {
            'context': {
                "client": {
                  "hl": "en",
                  "gl": "US",
                  "remoteHost": "70.190.160.240",
                  "deviceMake": "",
                  "deviceModel": "",
                  "visitorData": "CgtVbmR5bk9HMFZ1ayib9JSoBjIICgJVUxICGgA%3D",
                  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36,gzip(gfe)",
                  "clientName": "WEB",
                  "clientVersion": "2.20230914.04.00",
                  "osName": "Windows",
                  "osVersion": "10.0",
                  "originalUrl": "https://www.youtube.com/playlist?list=PLnIB0XeUqT-hlVYRC3mf1Yc1tSuOwmEf2",
                  "platform": "DESKTOP",
                  "clientFormFactor": "UNKNOWN_FORM_FACTOR",
                  "configInfo": {
                    "appInstallData": "CJv0lKgGEJfn_hIQieiuBRDnuq8FEO6irwUQ1eWvBRDi1K4FENnJrwUQuIuuBRDT4a8FEIjjrwUQx-avBRClwv4SEOSz_hIQ5OavBRC15q8FEMzfrgUQu-uvBRDd6P4SEOrDrwUQ65OuBRDUoa8FEIzLrwUQp-r-EhCst68FEL22rgUQhuqvBRCm7P4SEPOorwUQg9-vBRD65P4SELrSrwUQvMz-EhDW6q8FEN3rrwUQxN2vBRDr6P4SELTJrwUQtaavBRCj3q8FENuvrwUQt-r-EhD6vq8FEMyu_hIQlNn-EhDj8K8FELPr_hIQv-avBRDs4a8F"
                  },
                  "userInterfaceTheme": "USER_INTERFACE_THEME_DARK",
                  "timeZone": "America/Phoenix",
                  "browserName": "Chrome",
                  "browserVersion": "116.0.0.0",
                  "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                  "deviceExperimentId": "ChxOekkzT1RJNE9ESTJNRFV3TlRneU56QXlPQT09EJv0lKgGGJv0lKgG",
                  "screenWidthPoints": 727,
                  "screenHeightPoints": 923,
                  "screenPixelDensity": 1,
                  "screenDensityFloat": 1,
                  "utcOffsetMinutes": -420,
                  "connectionType": "CONN_CELLULAR_4G",
                  "memoryTotalKbytes": "8000000",
                  "mainAppWebInfo": {
                    "graftUrl": "https://www.youtube.com/playlist?list=PLnIB0XeUqT-hlVYRC3mf1Yc1tSuOwmEf2",
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
                  "internalExperimentFlags": [
                    {
                      "key": "force_enter_once_in_webview",
                      "value": "true"
                    }
                  ],
                  "consistencyTokenJars": []
                },
                "clickTracking": {
                  "clickTrackingParams": "CEAQui8iEwiz5YePsK6BAxVwT0wIHRaJDn8="
                },
                "adSignalsInfo": {
                  "params": [
                    {
                      "key": "dt",
                      "value": "1694841370403"
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
                      "value": "3"
                    },
                    {
                      "key": "u_h",
                      "value": "1080"
                    },
                    {
                      "key": "u_w",
                      "value": "1920"
                    },
                    {
                      "key": "u_ah",
                      "value": "1032"
                    },
                    {
                      "key": "u_aw",
                      "value": "1920"
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
                      "value": "923"
                    },
                    {
                      "key": "biw",
                      "value": "710"
                    },
                    {
                      "key": "brdim",
                      "value": "2560,81,2560,81,1920,81,1920,1032,727,923"
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
                  ]
                }
              },
            'continuation' : continuationKey
        }

		body = (await axios({'method': 'POST', 'url': postURL, 'headers': headers, 'data': postData})).data
        let contents = body;
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
            videos = videos.concat(await getYoutubePlaylistContinuation(innertube_api_key, continutationToken));
        }

        return videos

    } catch (error) {
        return []
    }
}

export async function getYoutubePlaylist(url){
    try{
        let body;

		let videos = []
		
		headers = {
			headers: {
				'Access-Control-Allow-Origin' : '*',
				'x-youtube-client-name': 1,
				'x-youtube-client-version': '2.20200911.04.00',
				'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
			}
		}

		const dataRegex  = /var\ ytInitialData\ \=\ \'(.*)\'\;<\/script>/
		const apiRegex  = /"innertubeApiKey":"(.*?)"/
        const continuationTokenRegex = /continuationCommand.+?:\\x22(.+?)\\x22,/
        const titleRegex = /<title>(.+?) - YouTube - YouTube<\/title>/

		body = (await axios(url, headers)).data
		const raw = dataRegex.exec(body)[1]
		const apikey = apiRegex.exec(body)[1]
		const continuationToken = continuationTokenRegex.exec(body)[1]
		const title = titleRegex.exec(body)[1]

		let data = JSON.parse(decodeHex(raw))
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
        
        let continuedVideos = await getYoutubePlaylistContinuation(apikey, continuationToken);
        videos = videos.concat(continuedVideos);

        for(let i = 0; i < videos.length; i++){
            videos[i]['saved'] = false;
            if(await SQLActions.checkIfVideoIdExists(videos[i].video_id))
                videos[i]['saved'] = true;
        }

        return {'data': videos, 'title': title};
	}
	catch(error){
        return {'data': [], 'title': null};
	}
}

export async function getYoutubeMusicPlaylist(){

}

export async function getSpotifyPlaylist(url){
    try {
        const playlistUID = url.replace(/https:\/\/open\.spotify\.com\/(album|playlist)\//,'')

        headers = {
            headers: {
                'Access-Control-Allow-Origin' : '*',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
            }
        }

        body = (await axios({'method': 'GET', 'url': url, 'headers': headers})).data
        const sessionRegex = /<script id="session" data-testid="session" type="application\/json">(.+?)<\/script>/
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
              "Referrer-Policy": "strict-origin-when-cross-origin"
            },
                "body": "{\"client_data\":{\"client_version\":\"1.2.21.625.gab84de47\",\"client_id\":\"" + sessionJson.clientId + "\",\"js_sdk_data\":{\"device_brand\":\"unknown\",\"device_model\":\"unknown\",\"os\":\"windows\",\"os_version\":\"NT 10.0\",\"device_id\":\"null\",\"device_type\":\"computer\"}}}",
                "method": "POST"
        });
        clientToken = await clientToken.json();

        let playlistData;
        let tracks = [];

        if(url.includes("album")){
            playlistData = await fetch("https://api-partner.spotify.com/pathfinder/v1/query?operationName=getAlbum&variables=%7B%22uri%22%3A%22spotify%3Aalbum%3A" + playlistUID + "%22%2C%22locale%22%3A%22%22%2C%22offset%22%3A0%2C%22limit%22%3A50%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2246ae954ef2d2fe7732b4b2b4022157b2e18b7ea84f70591ceb164e4de1b5d5d3%22%7D%7D", {
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
            playlistData = await fetch("https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=%7B%22uri%22%3A%22spotify%3Aplaylist%3A"+ playlistUID +"%22%2C%22offset%22%3A0%2C%22limit%22%3A25%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2273a3b3470804983e4d55d83cd6cc99715019228fd999d51429cc69473a18789d%22%7D%7D", {
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
    let amznMusic = {};
    {
        let configBody = (await axios({'method': 'GET', 'url': url, 'headers': headers})).data
       
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
            return null;
        }
    }
                        
    let trimmedURL = url.replace("https://",'').replace("music.amazon.com",'');

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
    let playlistData = await fetch("https://na.mesk.skill.music.a2z.com/api/showHome", {
        "headers": {
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
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": body,
        "method": "POST"
    });

    playlistData = await playlistData.json();

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
            'video_name': amznTrackData[i].primaryText,
            'video_creator': amznTrackData[i].secondaryText1,
        })
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

    return {data: results, title: playlistData.methods[templateListIndex].template.headerImageAltText}
  } catch (error) {
    return {data: [], title: null}
  }
}

export async function getSoundcloudPlaylist(){
    // const initialTrackRegex = /"artist": ?"(.+?)".+?"title": ?"(.+?)"/gs;
}