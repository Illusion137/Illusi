import axios from "axios"; //HTTP Request Library
import SearchYouTube, { GenerateNewUID, decodeHex, durationToInt } from "./IllusiveSearch";
import * as Prefs from "../../Preferences";

export async function getAllYoutubePlaylistsFromAccount(){
    try {
        let response = (await axios({'url': "https://www.youtube.com/feed/library", 'method': 'GET', 'headers': {
            'Cookies': Prefs.prefs.external_services.youtube_cookies
        }})).data
        response = decodeHex(response);

        const ytInitialDataRegex = /var ytInitialData = (.+?);.+?<\/script>/gs;
        let ytInitialData = ytInitialDataRegex.exec(response)[1]
        ytInitialData = ytInitialData.replaceAll(/\n\s+/g,'')
        ytInitialData = JSON.stringify(ytInitialData)
        ytInitialData = ytInitialData.slice(2, ytInitialData.length - 2)
        ytInitialData = JSON.parse(decodeHex(ytInitialData));
        
        let playlistNamesData = ytInitialData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[2].shelfRenderer.content.verticalListRenderer.items
        // console.log(JSON.stringify(playlistNamesData))
        let playlistNames = new Map();
        for(const playlistName of playlistNamesData){
            try {
                playlistNames.set(playlistName.compactPlaylistRenderer.title.runs[0].text, playlistName.compactPlaylistRenderer.shareUrl)
            } catch (error) {
                console.log(error)
            }
        }
        if(playlistNames.size == 0 || playlistNames == undefined)
            return undefined;
        return playlistNames

    } catch (error) {
        console.log(error)
        return undefined;
    }
}