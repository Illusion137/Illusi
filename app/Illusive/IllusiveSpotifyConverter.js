import SearchYouTubeVideos from "./IllusiveSearch";
//
import axios from "axios";
import cio  from 'cheerio-without-node-native'

/**
 * Takes Spotify URL and converts all songs into YouTube data 
 * @param {string} spotifyURL - The Spotify URL
 */
async function ConvertSpotifyToYouTube(spotifyURL){
	try{
		let spotifyData = await axios.get(spotifyURL).data;
		const $ = cio.load(spotifyData);
		let spotifyTrackData = [];
		$('.JUa6JJNj7R_Y3i4P8YUX').children().first().next().children().each(function (i, elem) {
			$(this).find('a').slice(0, 2).each(function () {
				spotifyTrackData.push($(this).html())
			})
		})
	
		let trackData = [];
		for (let i = 0; i < spotifyTrackData.length; i += 2) {
			trackData.push(SearchYouTubeVideos(spotifyTrackData[i] + ' ' + spotifyTrackData[i + 1]));
		}
	
		console.log(trackData)
	}
	catch(error){
		console.log(error);
	}
}

export default ConvertSpotifyToYouTube;