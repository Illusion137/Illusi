import axios from "axios"; //HTTP Request Library
import AsyncStorage from '@react-native-async-storage/async-storage';

function GenerateNewUUID() {
	return new Date().getTime().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15);

	// if(storage == null){
	// 	return fUUID
	// }

	// let parsedStorage = JSON.parse(storage)

	// let allUUIDSet = new Set( parsedStorage.map( ({uuid}) => uuid ) )

	// if(!allUUIDSet.has(fUUID)){
	// 	return fUUID;
	// }

	// while(1){
	// 	let newUUID = new Date().getTime().toString(36).substring(2, 15) +
	// 	Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) +
	// 	Math.random().toString(36).substring(2, 15);
	// 	if(!allUUIDSet.has(newUUID)){
	// 		return newUUID;
	// 	}
	// }
}

function DurationToInt(durationString){
	let duration = 0;
	
	for(let i = durationString.length-1; i >= 0; i--){
		if(i == durationString.length-1){
			duration += parseInt(durationString[i])
		}
		else{
			duration += parseInt(durationString[i]) * (6 * ((durationString.length - 1 - i) * 10))
		}
	}

	return duration
}

function RemoveHexCodes(cleanupString){
	try {
		let newString = cleanupString
		let temp;
		for(let i=0; i< cleanupString.match(/\\x([A-F,0-9][A-F,0-9])/i).length; i++){
			temp = newString.replace(/\\x([A-F,0-9][A-F,0-9])/i,
				String.fromCharCode(
					parseInt(
						newString.match(/\\x([A-F,0-9][A-F,0-9])/i)[0].replace('\\x', '') , 16
					) 
				)
			)
		}
		return temp
	} catch (error) {
		return cleanupString
	}
}

/**
 * Parses and formats YouTube video 
 * @param {string} toFormatString - The string of 'JSON' to format
 */
function FormatVideo(toFormatString){
	try {
		//Regular Expressions
		const idRegex = /(https:\\\/\\\/i\.ytimg\.com\\\/vi\\\/)(.+?)(?=\\\/default\.jpg)/;
		const titleRegex = /(\\x22text\\x22:\\x22)(.*?)(?=\\x22\\x7d\\x5d)/
		const artistRegex = /(\\x22shortBylineText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22)(.*?)(?=\\x22,)/ ;
		const durationRegex = /(\\x22lengthText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22)(.*?)(?=\\x22)/ ;
		
		//All video data
		let id = toFormatString.match(idRegex)[0].replace('https:\\\/\\\/i.ytimg.com\\\/vi\\\/', '')
		let title = RemoveHexCodes(toFormatString.match(titleRegex)[0].replace('\\x22text\\x22:\\x22', '')).replaceAll(/\\\\u\d+/g, '').replaceAll(/\\/g, '')
		let artist = RemoveHexCodes(toFormatString.match(artistRegex)[0].replace('\\x22shortBylineText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22', '')).replaceAll(/\\\\u\d+/g, '').replaceAll(/\\/g, '')
	
		let durationTextArray = toFormatString.match(durationRegex)[0].replace('\\x22lengthText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22', '').split(':')
		
		let uuid = GenerateNewUUID()

		return { // Returns video JSON
			"video_duration": DurationToInt(durationTextArray) || 0,
			"video_name": title || "",
			"video_creator": artist || "",
			"video_id": id || "",
			"saved": false,
			"downloaded": false,
			"uuid": uuid
		}
	} catch (error) {
		console.log(error)
		return
	}
}
//channelRenderer
//playlistRenderer

async function getYouTubeRehashInfo(body){
	try{
		const apiKeyRegex = /(INNERTUBE_API_KEY":")(.*?)(?=")/;
		const tokenRegex = /(token\\x22:\\x22)(.*?)(?=\\x22)/;
		const clientVersionRegex = /(INNERTUBE_CONTEXT_CLIENT_VERSION":")(.*?)(?=")/;
		const locationRegex = /(INNERTUBE_CONTEXT_GL":")(.*?)(?=")/;
		const languageRegex = /(INNERTUBE_CONTEXT_HL":")(.*?)(?=")/;
		const clientNameRegex = /(INNERTUBE_CLIENT_NAME":")(.*?)(?=")/;
		
		let shortenedBody = body.slice(body.indexOf('INNERTUBE_API_KEY'))
		return {
			apiKey: shortenedBody.match(apiKeyRegex)[0].replace('INNERTUBE_API_KEY":"',''),
			token: shortenedBody.match(tokenRegex)[0].replace('token\\x22:\\x22',''),
			clientVersion: shortenedBody.match(clientVersionRegex)[0].replace('INNERTUBE_CONTEXT_CLIENT_VERSION":"',''),
			options:{
				gl: shortenedBody.match(locationRegex)[0].replace('INNERTUBE_CONTEXT_GL":"',''),
				hl: shortenedBody.match(languageRegex)[0].replace('INNERTUBE_CONTEXT_HL":"',''),
				clientName: shortenedBody.match(clientNameRegex)[0].replace('INNERTUBE_CLIENT_NAME":"','')
			}
		}
	}catch(error){
		console.log(error)
		return {}
	}
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
	try{
		let body = await axios.get(`https://www.youtube.com/results?search_query=${searchTerms.replace(' ', '+')}`)
		let itemSec1Pos = body.data.indexOf('itemSectionRenderer') //Initial Starting Position Index right before the JSON
		//Get HTML from search query
		let itemSectionRender = body.data.slice(body.data.indexOf('itemSectionRenderer', itemSec1Pos + 1)) //The start of the JSON body
		let formatingSectionRender = itemSectionRender.replaceAll('videoWithContextRenderer', '::videoWithContextRenderer') //Formats body to be ready for spliting JSON into videos
		let unparsedVideos = formatingSectionRender.split('::')
		//START AT INDEX ONE FOR UNPARSED VIDEOS===================================================================================
		
		let numOfVideos = unparsedVideos.length //Amount of Videos found
		// console.log(unparsedVideos[1])
		
		let data = [] //To Return
		if(limit == 0 || limit >= numOfVideos){ // Parse all Videosc
			for(let i = 1; i < numOfVideos-1; i++){
				data.push(FormatVideo(unparsedVideos[i])) //push formated video to data
			}
		}
		else{ // Parse videos specified in limit
			for(let i = 1; i < limit+1; i++){
				data.push(FormatVideo(unparsedVideos[i])) //push formated video to data
			}
		}
		// console.log(data)
		let continueInfo = await getYouTubeRehashInfo(body.data);
		return {continueData: continueInfo, data: data} //Return Array of Videos
	}
	catch(error){
		console.log(error)
	}
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

		innerJSON[0].itemSectionRenderer.contents.forEach((track) => {
			data.push({
				"video_duration": DurationToInt(track.compactVideoRenderer.lengthText.runs[0].text.split(':')),
				"video_name": track.compactVideoRenderer.title.runs[0].text,
				"video_creator": track.compactVideoRenderer.longBylineText.runs[0].text,
				"video_id": track.compactVideoRenderer.videoId,
			})
		});
		return {
			token: newToken,
			data: data
		};
	} catch (error) {
		console.log(error)
	}
}
export {ContinueYouTubeSearch, GenerateNewUUID};
export default SearchYouTube;

/* Hex => ASCII
\x22 = "
\x7b = {
\x5b = [
etc...
*/

// Daniel Raygoza @ Illusion
// Github : Illusion137