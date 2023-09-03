import axios from "axios"; //HTTP Request Library
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as usetube from 'usetube'

function GenerateNewUUID(prefixName) {
	return prefixName + ' - ' + new Date().getTime().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15);
}
function decodeHex(hex) {
	return hex.replace(/\\x22/g, '"').replace(/\\x7b/g, '{').replace(/\\x7d/g, '}').replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x3b/g, ';').replace(/\\x3d/g, '=').replace(/\\x27/g, '\'').replace(/\\\\/g, 'doubleAntiSlash').replace(/\\/g, '').replace(/doubleAntiSlash/g, '\\')
  }
function DurationToInt(durationString){
	let duration = 0;
	let splitDuration = durationString.split(',')
	
	for(let i = 0; i < splitDuration.length; i++){
		if(splitDuration[i].includes('hour') || splitDuration[i].includes('hours')){
			duration += parseInt ( RegExp(/\d+/).exec(splitDuration[i])[0] ) * 3600
		}
		else if(splitDuration[i].includes('minute') || splitDuration[i].includes('minutes')){
			duration += parseInt ( RegExp(/\d+/).exec(splitDuration[i])[0] ) * 60
		}
		else if(splitDuration[i].includes('second') || splitDuration[i].includes('seconds')){
			duration += parseInt ( RegExp(/\d+/).exec(splitDuration[i])[0] )
		}
	}

	return duration
}
/**
 * Returns an array of videos from YouTube
 * @param {string} searchTerms - What to search YouTube for
 * @param {int} limit - The max amount of videos to return. If zero returns all
 */
async function SearchYouTube(searchTerms, limit = 0){ //returns first video
	if(searchTerms.trim === ''){
		return 0
	}
	let body;
	try{
		let urlstring = 'https://m.youtube.com/results?videoEmbeddable=true&search_query=' + encodeURI(searchTerms)

		const videos = []
		
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

		body = (await axios(urlstring, headers)).data
		const raw = dataRegex.exec(body)?.[1] || '{}'
		const apikey = apiRegex.exec(body)[1] || ''

		let data = JSON.parse(decodeHex(raw))
		data.apikey = apikey
		let apiKey = data.apiKey

		let searchData = [...JSON.stringify(data).matchAll(/accessibilityData":{"label":"([^{}]+) by ([^{}]+)( \d+ (year|month|day|hour|minute|second|years|months|days|hours|minutes|seconds) ago ((\d+ (hour|minute|second|hours|minutes|seconds), )+(\d+ (hour|minute|second|hours|minutes|seconds)))) (.+?)"watchEndpoint":{"videoId":"(.+?)"/g)]
		const pushData = []
		
		for (const id of searchData) {
			// let accessibility = id.slice(id.indexOf('],"accessibility":{"accessibilityData":{"label":"'))
			let uuid = GenerateNewUUID(id[1].replaceAll('\\', ''))
			pushData.push({
					'video_id': id[11] || '',
					'video_name': id[1].replaceAll('\\', '') || '',
					'video_creator': id[2].replaceAll('\\', '') || '',
					'video_duration': DurationToInt(id[5]) || '',
					'uuid': uuid
				})
		}
			return {data: pushData}
	}
	catch(error){
		console.log(error)
	}
	// let data = await usetube.searchVideo(searchTerms)
	// const reData = []
	// for(const video of data.videos){
	// 	let uuid = GenerateNewUUID()
	// 	reData.push(
	// 		{ // Returns video JSON
	// 			"video_duration": video.duration || 0,
	// 			"video_name": video.title || "",
	// 			"video_creator": video.artist || "",
	// 			"video_id": video.id || "",
	// 			"saved": false,
	// 			"downloaded": false,
	// 			"uuid": uuid
	// 		}
	// 	)
	// }
	// return {continueData: {	
	// 		apiKey: data.apikey,
	// 		token: data.token, 
	// 	},data: reData}
}

/**

// const clientVersion = between(body, 'INNERTUBE_CONTEXT_CLIENT_VERSION":"', '"') ||
    // between(body, 'innertube_context_client_version":"', '"');
  // Make deep copy and set clientVersion
//   const context = JSON.parse(JSON.stringify(DEFAULT_CONTEXT));
//   context.client.clientVersion = clientVersion;
  // Add params to context
//   if (options.gl) context.client.gl = options.gl;
//   if (options.hl) context.client.hl = options.hl;
//   if (options.utcOffsetMinutes) context.client.utcOffsetMinutes = options.utcOffsetMinutes;
//   if (options.safeSearch) context.user.enableSafetyMode = true;
//   // Return multiple values
//   return { json, apiKey, context };

/*
clientVersion 2.20221122.06.00
DEFAULT_CONTEXT = {
  client: {
    utcOffsetMinutes: 0,
    gl: 'US',
    hl: 'en',
    clientName: 'WEB',
    clientVersion: '2.20221122.06.00',
  },
  user: {},
  request: {},
}

*/
//apiKey, token, clientVersion, options
async function ContinueYouTubeSearch(continueData){
	try {
		let response = await axios.post(`https://www.youtube.com/youtubei/v1/search?key=${continueData.apiKey}`,{context : {
				client: {
				utcOffsetMinutes: 0,
				gl: continueData.options.gl, // DefaultGLobalLocation = 'US'
				hl: continueData.options.hl, // DefaultLanguage = 'en'
				clientName: continueData.options.clientName, // DefaultClientName = 'WEB'
				clientVersion: continueData.clientVersion, //Reference = '2.20221122.06.00'
				},
				user: {},
				request: {},
			},
			continuation: continueData.token
		})
		// console.log(JSON.stringify(response.data))
		let innerJSON = response.data.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;
		let newToken = innerJSON[1].continuationItemRenderer.continuationEndpoint.continuationCommand.token;

		let data = []

		for(const track of innerJSON[0].itemSectionRenderer.contents){
			data.push({
				"video_duration": DurationToInt(track.compactVideoRenderer.lengthText.runs[0].text.split(':')),
				"video_name": track.compactVideoRenderer.title.runs[0].text,
				"video_creator": track.compactVideoRenderer.longBylineText.runs[0].text,
				"video_id": track.compactVideoRenderer.videoId,
			})
		};
		return {
			token: newToken,
			data: data
		};
	} catch (error) {
		console.log(error)
	}
}
export { GenerateNewUUID };
export default SearchYouTube;

/* Hex => ASCII
\x22 = "
\x7b = {
\x5b = [
etc...
*/

// Daniel Raygoza @ Illusion
// Github : Illusion137