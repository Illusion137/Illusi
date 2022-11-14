import axios from "axios"; //HTTP Request Library

/**
 * Parses and formats video 
 * @param {string} toFormatString - The string of 'JSON' to format
 */
function FormatVideo(toFormatString){
	//Regular Expressions
	const idRegex = /(compactVideoRenderer\\x22:\\x7b\\x22videoId\\x22:\\x22)(.*?)(?=\\x22)/g
	const titleRegex = /(\\x22title\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22)(.*?)(?=\\x22)/
	const artistRegex = /(\\x22longBylineText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22)(.*?)(?=\\x22)/ ;
	const durationRegex = /(\\x22lengthText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22)(.*?)(?=\\x22)/ ;
	
	//All video data
	let id = toFormatString.match(idRegex)[0].replace('compactVideoRenderer\\x22:\\x7b\\x22videoId\\x22:\\x22', '')
	let title = toFormatString.match(titleRegex)[0].replace('\\x22title\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22', '')
	let artist = toFormatString.match(artistRegex)[0].replace('\\x22longBylineText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22', '')

	let durationTextArray = toFormatString.match(durationRegex)[0].replace('\\x22lengthText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22', '').split(':')
	
	let duration = 0;

	for(let i = durationTextArray.length-1; i >= 0; i--){
		if(i == durationTextArray.length-1){
			duration += parseInt(durationTextArray[i])
		}
		else{
			duration += parseInt(durationTextArray[i]) * (6 * ((durationTextArray.length - 1 - i) * 10))
		}
	}
	return { // Returns video JSON
		"video_duration": duration,
		"video_name": title,
		"video_creator": artist,
		"video_id": id,
	}
}

/**
 * Returns an array of videos from YouTube
 * @param {string} searchTerms - What to search YouTube for
 * @param {int} limit - The max amount of videos to return. If zero returns all
 */
async function illusiveSearchVideo(searchTerms, limit = 0){ //returns first video
	let data = [] //To Return

	//Get HTML from search query
	let body = await axios.get(`https://www.youtube.com/results?search_query=${searchTerms.replace(' ', '+')}`)
	let itemSec1Pos = body.data.indexOf('itemSectionRenderer') //Initial Starting Position Index right before the JSON
	let itemSectionRender = body.data.slice(body.data.indexOf('itemSectionRenderer', itemSec1Pos + 1)) //The start of the JSON body
	let formatingSectionRender = itemSectionRender.replaceAll('compactVideoRenderer', '::compactVideoRenderer') //Formats body to be ready for spliting JSON into videos
	let unparsedVideos = formatingSectionRender.split('::')
	//START AT INDEX ONE FOR UNPARSED VIDEOS===================================================================================
	
	let numOfVideos = unparsedVideos.length //Amount of Videos found

	if(limit == 0){ // Parse all Videos
		for(let i = 1; i < numOfVideos-1; i++){
			data.push(FormatVideo(unparsedVideos[i])) //push formated video to data
		}
	}
	else{ // Parse videos specified in limit
		for(let i = 1; i < limit+1; i++){
			data.push(FormatVideo(unparsedVideos[i])) //push formated video to data
		}
	}

	return data //Return Array of Videos
}

export default illusiveSearchVideo;

/* Hex => ASCII
\x22 = "
\x7b = {
\x5b = [
etc...
*/

// Daniel Raygoza @ Illusion
// Github : Illusion137