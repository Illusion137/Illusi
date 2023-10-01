import axios from "axios";
import * as Prefs from '../../Preferences'
import { decodeHex } from "./IllusiveSearch";

export function getYTPlaylistIdFromURL(url){
    const idRegex = /(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=/
    return url.replace(idRegex, '')
}

export async function insertIntoYouTubePlaylist(playlistId, videoIds){
    try {
        
        let cookies = Prefs.prefs.external_services.youtube_cookies;
        let body = {'privacyStatus': 'UNLISTED', 'context': {}, 'title': 'transfer 3', videoIds: []};
        body.videoIds = videoIds
        let headers = {
            'Access-Control-Allow-Origin' : '*',
            'x-youtube-client-name': 1,
            'x-youtube-client-version': '2.20230925.02.00',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
            'Cookies': cookies,
        }
        let ytBase = await axios({'method': 'GET', 'url': 'https://www.youtube.com/', 'headers': headers, 'withCredentials': true});
        // Prefs.prefs.external_services.youtube_cookies = Prefs.updateCookies(cookies, ytBase.headers['set-cookie'])
        // cookies = Prefs.prefs.external_services.youtube_cookies
        ytBase = ytBase.data
        const keyRegex = /"INNERTUBE_API_KEY": ?\"(.+?)\"/s;
        const contextRegex = /INNERTUBE_CONTEXT": ?({.+?}})/s;
    
        let context = JSON.parse(contextRegex.exec(ytBase)[1].replaceAll(/\n\s+/g,''))
        let key = keyRegex.exec(ytBase)[1]

        body.context = {
            "context": {
                "client": {
                    "hl": "en",
                    "gl": "US",
                    "remoteHost": "2600:8800:920a:d400:e598:5db1:88ba:301f",
                    "deviceMake": "",
                    "deviceModel": "",
                    "visitorData": "CgtVbmR5bk9HMFZ1ayjuw9moBjIICgJVUxICGgA%3D",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36,gzip(gfe)",
                    "clientName": "WEB",
                    "clientVersion": "2.20230928.01.00",
                    "osName": "Windows",
                    "osVersion": "10.0",
                    "originalUrl": "https://www.youtube.com/",
                    "platform": "DESKTOP",
                    "clientFormFactor": "UNKNOWN_FORM_FACTOR",
                    "configInfo": {
                        "appInstallData": "CO7D2agGELTJrwUQ0-GvBRDZ7q8FEInorgUQlNn-EhC3768FELWmrwUQjfmvBRDUoa8FEKDxrwUQ4_CvBRDA6q8FEL22rgUQvOuvBRDi1K4FEMzfrgUQ29ivBRCj3q8FEOvo_hIQg9-vBRC4-68FEKn3rwUQuIuuBRCZ8K8FEO6irwUQt-r-EhCst68FELrSrwUQr_qvBRDMrv4SENuvrwUQ57qvBRDp6P4SEJfn_hIQpcL-EhCI468FEN3o_hIQ65OuBRCn968FEKfq_hIQ2cmvBRDj8q8FEPOorwUQxN2vBRDV5a8FEOSz_hIQ9fmvBRDqw68FELD6rwUQ-r6vBRCm7P4SENvvrwUQgvD-EhDs4a8FEOXyrwU%3D"
                    },
                    "userInterfaceTheme": "USER_INTERFACE_THEME_DARK",
                    "timeZone": "America/Phoenix",
                    "browserName": "Chrome",
                    "browserVersion": "117.0.0.0",
                    "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "deviceExperimentId": "ChxOekk0TkRFeE56RXhPVGc1T0RFMU1qazJNQT09EO7D2agGGO3D2agG",
                    "screenWidthPoints": 1528,
                    "screenHeightPoints": 1283,
                    "screenPixelDensity": 1,
                    "screenDensityFloat": 1,
                    "utcOffsetMinutes": -420,
                    "connectionType": "CONN_CELLULAR_4G",
                    "memoryTotalKbytes": "8000000",
                    "mainAppWebInfo": {
                        "graftUrl": "https://www.youtube.com/",
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
                    "clickTrackingParams": "CAAQisQGIhMI5Z6IuI3PgQMVrktMCB0yzwSS"
                },
                "adSignalsInfo": {
                    "params": [
                        {
                            "key": "dt",
                            "value": "1695965677701"
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
                            "value": "2"
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
                            "value": "1512"
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
                    ]
                }
            },
            "title": "Trnsf5",
            "privacyStatus": "UNLISTED",
            "videoIds": [
                "nIZrVsecfYY"
            ]
        }

        // body.context.client['remoteHost'] = context.client.remoteHost;
        // body.context.client['visitorData'] = context.client.visitorData;

        // https://www.youtube.com/youtubei/v1/playlist/create?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false
        // console.log(JSON.stringify(body))
        let ban = await axios({'method': 'POST', 'url': `https://www.youtube.com/youtubei/v1/playlist/create?key=${key}&prettyPrint=false`, 
        'headers': headers, 'data': body, 'withCredentials': true
        });
        // let ban = await axios({'method': 'POST', 'url': `https://www.youtube.com/youtubei/v1/browse/edit_playlist?key=${key}&prettyPrint=false`, 
        //     'headers': headers, 'data': body, 'withCredentials': true
        // });
        console.log(ban.data)
        // console.log(JSON.stringify(ban.data))
    } catch (error) {
        console.log(error)
    }
    // "accept": "*/*",
    // "accept-language": "en-US,en;q=0.9",
    // "authorization": "SAPISIDHASH 1695879899_bcd29dcf65c9f765090dcb89fb20147090d08c0a",
    // "content-type": "application/json",
    // "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
    // "sec-ch-ua-arch": "\"x86\"",
    // "sec-ch-ua-bitness": "\"64\"",
    // "sec-ch-ua-full-version": "\"117.0.5938.92\"",
    // "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"117.0.5938.92\", \"Not;A=Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"117.0.5938.92\"",
    // "sec-ch-ua-mobile": "?0",
    // "sec-ch-ua-model": "\"\"",
    // "sec-ch-ua-platform": "\"Windows\"",
    // "sec-ch-ua-platform-version": "\"15.0.0\"",
    // "sec-ch-ua-wow64": "?0",
    // "sec-fetch-dest": "empty",
    // "sec-fetch-mode": "same-origin",
    // "sec-fetch-site": "same-origin",
    // "x-client-data": "CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJahywEI85jNAQiFoM0BCNy9zQEI38TNAQi5ys0BCMXRzQEI1NTNAQjM1s0BCOLWzQEI+cDUFRi60s0BGOuNpRc=",
    // "x-goog-authuser": "0",
    // "x-goog-visitor-id": "CgtVbmR5bk9HMFZ1ayjNpdSoBjIICgJVUxICGgA%3D",
    // "x-origin": "https://www.youtube.com",
    // "x-youtube-bootstrap-logged-in": "true",
    // "x-youtube-client-name": "1",
    // "x-youtube-client-version": "2.20230925.02.00",
    // "Referer": "https://www.youtube.com/",
    // "Referrer-Policy": "strict-origin-when-cross-origin"
}