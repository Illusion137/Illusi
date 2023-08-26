import axios from "axios"; //HTTP Request Library

function decodeHex(hex) {
	return hex.replace(/\\x22/g, '"').replace(/\\x7b/g, '{').replace(/\\x7d/g, '}').replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x3b/g, ';').replace(/\\x3d/g, '=').replace(/\\x27/g, '\'').replace(/\\\\/g, 'doubleAntiSlash').replace(/\\/g, '').replace(/doubleAntiSlash/g, '\\')
}

async function YTDL(videoId){
	let body;
	let raw;
	try{
		let urlstring = 'https://www.youtube.com/watch?v=' + videoId

		headers = {
			headers: {
				'Access-Control-Allow-Origin' : '*',
				'x-youtube-client-name': 1,
				'x-youtube-client-version': '2.20200911.04.00',
				'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
			}
		}
		const dataRegex  = /<script.+?>var ytInitialPlayerResponse = ({.+?);<\/script>/
		const formatRegex  = /"formats":.+?url=(.+?)"}/

		body = (await axios(urlstring, headers)).data
		raw = dataRegex.exec(body)?.[1] || '{}'
		const format = formatRegex.exec(raw)?.[1]
		// decodeHex(
		console.log(format)
		return format
	}
	catch(error){
		console.log(raw)
		console.log(error)
	}
}
export default YTDL;