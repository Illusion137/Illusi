import axios from "axios"; //HTTP Request Library
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as usetube from 'usetube'
import { getAmazonMusicAmznMusicData, getAmazonMusicShowHomeData, getAmazonMusicUserHash, getAmznCsrf, getAmznMusicHeaders, getAmznMusicRequestHeaders, getAmznVideoPlayerToken, getXAmznAuth } from "./IllusiveAccountPlaylistFinder";

function GenerateNewUID(prefixName) {
	return prefixName.replaceAll(/[^a-zA-Z0-9]/g,'') + '-' + new Date().getTime().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15);
}
function decodeHex(hex) {
	return hex.replace(/\\x22/g, '"').replace(/\\x7b/g, '{').replace(/\\x7d/g, '}').replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x3b/g, ';').replace(/\\x3d/g, '=').replace(/\\x27/g, '\'').replace(/\\\\/g, 'doubleAntiSlash').replace(/\\/g, '').replace(/doubleAntiSlash/g, '\\')
  }
function durationToInt(durationString){
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

export function parseYTDuration(textDur){
    let textDurSplit = textDur.split(':')
    let j = 0;
    let duration = 0;
    for(let i = textDurSplit.length-1; i >= 0; i--){
        duration += (parseInt(textDurSplit[i]) * Math.pow(60,j))
        j++;
    }
    return duration
}

async function SearchYouTube(searchTerms, limit = 0, proxy = null){ //returns first video
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
		if(proxy == null){
			body = (await axios({'url':urlstring, 'headers':headers })).data
		}
		else{
			body = (await axios({'url':urlstring, 'headers':headers, 'proxy': {
				protocol: 'http',
				host: proxy.ip,
				port: proxy.port,
			}})).data
		}
		const raw = dataRegex.exec(body)?.[1] || '{}'
		const apikey = apiRegex.exec(body)[1] || ''
		
		let ytInitialData = JSON.parse(decodeHex(raw).replaceAll(/\n\s+/g,'').replaceAll('\n',''))
     
		let contents = ytInitialData.contents.sectionListRenderer.contents[0].itemSectionRenderer.contents
		// console.log(JSON.stringify(contents))
		ytInitialData.apikey = apikey
		let apiKey = ytInitialData.apiKey
		// let searchData = [...JSON.stringify(ytInitialData).matchAll(/"videoId":"(.+?)",.+?TimeStatusRenderer":.+?\[{"text":"(.+?)"}.+?accessibilityData":{"label":"([^{}]+) by ([^{}]+) [0-9,]+ views?.+?ago/g)]
//"videoId":"(.+?)",.+?accessibilityData":{"label":"([^{}]+) by ([^{}]+) [0-9,]+ views?.+?ago.+?lengthText.+?simpleText":"(.+?)"
		const pushData = []
		
		for (const video of contents) {
			try {				
				let uid = GenerateNewUID(video.videoWithContextRenderer.headline.runs[0].text)
				pushData.push({
				'video_id': video.videoWithContextRenderer.videoId,
				'video_name': video.videoWithContextRenderer.headline.runs[0].text,
				'video_creator': video.videoWithContextRenderer.shortBylineText.runs[0].text,
				'video_duration': parseYTDuration(video.videoWithContextRenderer.lengthText.runs[0].text),
				'youtube': true,
				'uid': uid
				})
			} catch (error) {
			}
		}

		// for (const id of searchData) {
		// 	try {				
		// 		let uid = GenerateNewUID(id[3].replaceAll('\\', ''))
		// 		pushData.push({
		// 		'video_id': id[1] || '',
		// 		'video_name': id[3].replaceAll('\\', '') || '',
		// 		'video_creator': id[4].replaceAll('\\', '') || '',
		// 		'video_duration': parseYTDuration(id[2]) || 0,
		// 		'uid': uid
		// 		})
		// 	} catch (error) {
		// 		console.log(error)
		// 	}
		// }

		return {data: pushData}
	}
	catch(error){
		console.log(error)
		return {data: []}
	}
	// let data = await usetube.searchVideo(searchTerms)
	// const reData = []
	// for(const video of data.videos){
	// 	let uid = GenerateNewUID()
	// 	reData.push(
	// 		{ // Returns video JSON
	// 			"video_duration": video.duration || 0,
	// 			"video_name": video.title || "",
	// 			"video_creator": video.artist || "",
	// 			"video_id": video.id || "",
	// 			"saved": false,
	// 			"downloaded": false,
	// 			"uid": uid
	// 		}
	// 	)
	// }
	// return {continueData: {	
	// 		apiKey: data.apikey,
	// 		token: data.token, 
	// 	},data: reData}
}
/*clientVersion 2.20221122.06.00
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
}*/
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
		let innerJSON = response.data.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;
		let newToken = innerJSON[1].continuationItemRenderer.continuationEndpoint.continuationCommand.token;

		let data = []

		for(const track of innerJSON[0].itemSectionRenderer.contents){
			data.push({
				"video_duration": durationToInt(track.compactVideoRenderer.lengthText.runs[0].text.split(':')),
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
	}
}

export async function searchAmazonMusic(query){
	try {		
		let url = `https://music.amazon.com/search/${query.replaceAll(' ', '+').replaceAll(/[^A-Za-z0-9+]+/g, '').replaceAll('++', '+')}`
		let filter = {'IsLibrary': ["false"]}
		let keyword = {
			"interface": "Web.TemplatesInterface.v1_0.Touch.SearchTemplateInterface.SearchKeywordClientInformation",
			"keyword": ""
		}
		let amznMusic = await getAmazonMusicAmznMusicData(url);
		let showHomeData = await getAmazonMusicShowHomeData(amznMusic, url);
	
		let authHeader = JSON.parse(showHomeData.methods[0].header);
	
		let userHash = getAmazonMusicUserHash();
		let xAmznAuth = getXAmznAuth(amznMusic);
		let amznCSRF = getAmznCsrf(amznMusic);
		let xAmznVideoPlayerToken = getAmznVideoPlayerToken(authHeader);
		let rqheaders = getAmznMusicRequestHeaders(xAmznAuth,amznMusic,amznCSRF,xAmznVideoPlayerToken,url);
		let requestPayload = {
			"filter":JSON.stringify(filter),
			"keyword": JSON.stringify(keyword),
			"suggestedKeyword": query,
			"userHash":	JSON.stringify(userHash),
			"headers": JSON.stringify(rqheaders)
		}
		let response = (await axios({'method': 'POST', 'url': "https://na.mesk.skill.music.a2z.com/api/showSearch", 'headers': getAmznMusicHeaders(), 'data': requestPayload})).data;
		let songWidgetsIndex = 2;
		let widgets = response.methods[0].template.widgets
		for(let i = 0; i < widgets.length; i++){
			if(widgets[i].header == "Songs"){
				songWidgetsIndex = i;
			}
		}
		let data = [];
		for(const item of response.methods[0].template.widgets[songWidgetsIndex].items){
			let id;
			try {
				id = item.primaryLink.deeplink.replace(/.+?trackAsin=/,'');
			} catch (error) {
				throw Error(":(")
			}
			data.push({
				'title': item.primaryText.text,
				'artist': item.secondaryText,
				'id': id,
			})
		}
		return data

	} catch (error) {
		console.log(error)
	}
} 


export { GenerateNewUID, decodeHex, durationToInt };
export default SearchYouTube;

// Daniel Raygoza @ Illusion
// Github : Illusion137