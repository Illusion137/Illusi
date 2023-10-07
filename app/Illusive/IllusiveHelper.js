import * as sha1 from 'sha1-uint8array'

export function getYouTubeSapisidHashAuth(SAPISID, ORIGIN = 'https://www.youtube.com'){
    let timeStampSecondsStr = String(new Date().getTime()).slice(0,10);
    let dataString = [timeStampSecondsStr, SAPISID, ORIGIN].join(' ');
    let data = Uint8Array.from(Array.from(dataString).map(letter => letter.charCodeAt(0)));
    let shaDigest = sha1.createHash().update(data).digest("hex");
    let SAPISIDHASH = `SAPISIDHASH ${timeStampSecondsStr}_${shaDigest}`;
    return SAPISIDHASH;
}