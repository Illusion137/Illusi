import axios from "axios";
async function getLyricsURL(video_name: string){
    try {
        let headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            'Cookies':'returning=8; mxm_bab=BA; translate_lang=%7B%22key%22%3A%22en%22%2C%22name%22%3A%22English%22%7D; musixmatchUserGuid=b5d128bd-6a14-4e11-b001-aebbd4427b41; _gid=GA1.2.1107272386.1696137923; _gcl_au=1.1.985646412.1696137923; _ga_GJ85JJL9ZK=GS1.1.1696137923.1.0.1696137923.0.0.0; _ga_VBR8JC2F39=GS1.1.1696137923.1.0.1696137924.0.0.0; OptanonAlertBoxClosed=2023-10-01T05:50:19.880Z; _ga_FPN5W0WTG8=GS1.1.1696137923.1.1.1696139423.0.0.0; _ga=GA1.1.913755206.1696137923; OptanonConsent=isGpcEnabled=0&datestamp=Sat+Sep+30+2023+22%3A50%3A23+GMT-0700+(Mountain+Standard+Time)&version=202208.1.0&isIABGlobal=false&hosts=&consentId=3cebf39c-26a6-4fec-bebc-afd789210d8c&interactionCount=2&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&AwaitingReconsent=false&geolocation=US%3BAZ'
          }

        let url = `https://www.musixmatch.com/search/${encodeURI(video_name.replace(/\(.+?\)/,''))}`
        console.log(url)
        let response = await axios({'url': url, 'headers': headers})
        const urlRegex = /<a.+?href=\\?"(\/lyrics.+?)"/
        return `https://www.musixmatch.com/${urlRegex.exec(response.data)[0]}`;
    } catch (error) {
        console.log(error)
    }
}

export async function getLyrics(video_name: string){
    try {        
        let lyrics = "";
    
        let url = await getLyricsURL(video_name);
        let response = (await axios({'url': url})).data
        const lyricsRegex = /<p class=\"mxm-lyrics__content \"><span class=\"lyrics__content__ok\">(.+?)<\/span>/gs
        let lyricsData = [...response.matchAll(lyricsRegex)]
        for(const lyric of lyricsData){
            lyrics += lyric[1]
        }
        console.log(lyrics)
        return lyrics;
    } catch (error) {
        console.log(error)     
    }
}