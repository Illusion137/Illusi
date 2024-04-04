import axios from "axios";
import * as Prefs from '../../Preferences'
import { decodeHex, searchAmazonMusic } from "./IllusiveSearch";
import { getAmazonMusicAmznMusicData, getAmazonMusicShowHomeData, getAmazonMusicUserHash, getAmznCsrf, getAmznMusicHeaders, getAmznMusicRequestHeaders, getAmznVideoPlayerToken, getXAmznAuth } from "./IllusiveAccountPlaylistFinder";
import { Alert } from "react-native";
import * as SQLActions from '../../SQLActions'
import * as Haptics from 'expo-haptics';
import { getYouTubeInitialData } from "./IllusivePlaylistResolver";
import { getYouTubeSapisidHashAuth } from "./IllusiveHelper";
import { Track } from "../../types";

export function getYTPlaylistIdFromURL(url: string){
    const idRegex = /(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=/
    return url.replace(idRegex, '')
}

export async function insertIntoYouTubePlaylist(playlistName: string, tracks: Track[]){
    try {
        let baseData = await getYouTubeInitialData('https://youtube.com');
        try {
            let body = {
                "context": baseData.INNERTUBE_CONTEXT,
                "title": playlistName + " - Illusi Export",
                "privacyStatus": "UNLISTED",
                "videoIds": tracks.map(({video_id}) => video_id)
            };
            let SAPISID = Prefs.cookiesToJson(Prefs.prefs.external_services.youtube_cookies)['SAPISID'];
            let headers = {
                'Access-Control-Allow-Origin' : '*',
                'x-youtube-client-name': 1,
                'x-youtube-client-version': '2.20230925.02.00',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
                'Cookies': Prefs.prefs.external_services.youtube_cookies,
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "authorization": getYouTubeSapisidHashAuth(SAPISID),
                "content-type": "application/json",
                "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
                "sec-ch-ua-arch": "\"x86\"",
                "sec-ch-ua-bitness": "\"64\"",
                "sec-ch-ua-full-version": "\"117.0.5938.149\"",
                "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"117.0.5938.149\", \"Not;A=Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"117.0.5938.149\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-model": "\"\"",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-ch-ua-platform-version": "\"15.0.0\"",
                "sec-ch-ua-wow64": "?0",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "same-origin",
                "sec-fetch-site": "same-origin",
                "x-client-data": "CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJShywEI85jNAQiFoM0BCNy9zQEIkcrNAQi5ys0BCMXRzQEIzNbNAQji1s0BCKjYzQEIttjNAQj5wNQVGLrSzQEYyNjNARjrjaUX",
                "x-goog-authuser": "0",
                "x-goog-visitor-id": "CgtVbmR5bk9HMFZ1ayjaiYmpBjIICgJVUxICGgA%3D",
                "x-origin": "https://www.youtube.com",
                "x-youtube-bootstrap-logged-in": "true",
                "Referer": "https://www.youtube.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
    
            let ban = await axios({'method': 'POST', 'url': `https://www.youtube.com/youtubei/v1/playlist/create?key=${baseData.INNERTUBE_API_KEY}&prettyPrint=false`, 
            'headers': headers, 'data': body
            });
            // console.log(ban.data)
        } catch (error) {
            Alert.alert('Error', error)
        }
        Alert.alert("Finished Transfering Playlist")
    } catch (error) {
        // Alert.alert(error)
    }
}

export function formatQuery(query: string){
    return query.replaceAll(/oficial audio/gi, '').replaceAll(/\(lyrics\).+/gi, '').replaceAll(/\(.+?\)/g, '').replaceAll(/\[.+?\]/g, '')
}

export async function insertIntoAmazonMusicPlaylist(playlistURL: string, playlistTitle: string, tracks: Track[]){
    try {
        let amznTracks = [];
        for(const track of tracks){
            if(track.amazonmusic){
                try {
                    let parsed = JSON.parse(track.exid);
                    let exidIndex = -1;
                    for(let i = 0; i < parsed.length; i++)
                        if(parsed[i].service == "amazon")
                            exidIndex = i;
                    amznTracks.push( parsed[exidIndex].exid.id )
                } catch (error) {
                    // console.log(error)
                }
            }
            else{
                try {
                    let query = track.video_name.replaceAll('  ', ' ')
                    query = formatQuery(query)
                    let searchTrack = (await searchAmazonMusic(query))[0];
                    let newexid;
                    
                    if(track.exid == ""){
                        newexid = JSON.stringify([{'exid': searchTrack, 'service': 'amazon'}])
                    }else{
                        newexid = JSON.stringify(JSON.parse(track.exid).push({'exid': searchTrack, 'service': 'amazon'}))
                    }
                    await SQLActions.updateTrackExid(track.uid, newexid, 'amazonmusic');
                    amznTracks.push(searchTrack.id)
                } catch (error) {
                    // console.log('er', error)
                }
            }
        }
        // console.log(amznTracks)
        let playlistId = playlistURL.replace(/(https?:\/\/)?(www\.)?music\.amazon\.com\/my\/playlists\//, '')
    
        let amznMusic = await getAmazonMusicAmznMusicData(playlistURL);
        let showHomeData = await getAmazonMusicShowHomeData(amznMusic, playlistURL);
    
        let authHeader = JSON.parse(showHomeData.methods[0].header);
    
        let userHash = getAmazonMusicUserHash();
        let xAmznAuth = getXAmznAuth(amznMusic);
        let amznCSRF = getAmznCsrf(amznMusic);
        let xAmznVideoPlayerToken = getAmznVideoPlayerToken(authHeader);
        let rqheaders = getAmznMusicRequestHeaders(xAmznAuth,amznMusic,amznCSRF,xAmznVideoPlayerToken,playlistURL);

        let selectedIds = {
            "interface": "Web.PageInterface.v1_0.SelectedItemsClientInformation",
            "ids": amznTracks
        }

        let requestPayload = {
            "headers": JSON.stringify(rqheaders),
            "playlistId": playlistId,
            "playlistTitle": playlistTitle,
            "rejectDuplicate": "true",
            "selectedIds": JSON.stringify(selectedIds),
            "userHash": JSON.stringify(userHash),
            "version": "14",
        }
        let response = await axios({'method': 'POST', 'url': "https://na.mesk.skill.music.a2z.com/api/addTracksToPlaylist", 
            'headers': getAmznMusicHeaders(),
            'data': requestPayload
        });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert("Finished Converting to: " + playlistTitle)
    } catch (error) {
        Alert.alert("Amzn Playlist Insert Error", error)
    }
}