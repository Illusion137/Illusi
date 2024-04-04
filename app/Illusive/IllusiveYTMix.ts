import axios from "axios";
import { Track } from "../../types";
import { decodeHex, GenerateNewUID, parseYTDuration } from "./IllusiveSearch";

export default async function getYouTubeMixTracks(video_id: string): Promise<Track[]> {
    const youtube_mix_url = `https://www.youtube.com/watch?v=${video_id}&start_radio=1&list=RD${video_id}`

    const response = (await axios({'url': youtube_mix_url, 'method': 'GET', 'headers': {
        'Access-Control-Allow-Origin' : '*',
        'x-youtube-client-name': 1,
        'x-youtube-client-version': '2.20200911.04.00',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
    }})).data;
    const yt_initial_data = JSON.parse(((/ytInitialData ?= ?'(.+?})'/s).exec(decodeHex(response))[1]).replaceAll(/\n\s+/g,''))

    const tracks: Track[] = []
    for(const track of yt_initial_data.contents.singleColumnWatchNextResults.playlist.playlist.contents){
        try {
            const title = track.playlistPanelVideoRenderer.title.runs[0].text;
            const uid = GenerateNewUID(title);
            const t = new Track({
                'video_id': track.playlistPanelVideoRenderer.videoId,
                'video_name': title,
                'video_creator': track.playlistPanelVideoRenderer.shortBylineText.runs[0].text,
                'video_duration': parseYTDuration(track.playlistPanelVideoRenderer.lengthText.runs[0].text),
                'youtube': true,
                'uid': uid,
            })
            t['successful'] = false;
            t['added'] = false;
            tracks.push(t);
        } catch (error) {
            console.log(error)
        }
    }
    tracks.splice(0,1);
    return tracks;
}