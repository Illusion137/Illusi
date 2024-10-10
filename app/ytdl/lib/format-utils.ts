import * as utils from './utils';
import { FORMATS } from './formats';
import { AVFormat, Filter, DownloadOptions } from './types';

// Use these to help sort formats, higher index is better.
const audioEncodingRanks = [
    'mp4a',
    'mp3',
    'vorbis',
    'aac',
    'opus',
    'flac',
];
const videoEncodingRanks = [
    'mp4v',
    'avc1',
    'Sorenson H.283',
    'MPEG-4 Visual',
    'VP8',
    'VP9',
    'H.264',
];

const getVideoBitrate = (format: AVFormat) => format.bitrate || 0;
const getVideoEncodingRank = (format: AVFormat) =>
    videoEncodingRanks.findIndex(enc => format.codecs && format.codecs.includes(enc));
const getAudioBitrate = (format: AVFormat) => format.audioBitrate || 0;
const getAudioEncodingRank = (format: AVFormat) =>
    audioEncodingRanks.findIndex(enc => format.codecs && format.codecs.includes(enc));


/**
 * Sort formats by a list of functions.
 *
 * @param {Object} a
 * @param {Object} b
 * @param {Array.<Function>} sortBy
 * @returns {number}
 */
const sortFormatsBy = (a: AVFormat, b: AVFormat, sortBy: ((format: AVFormat) => number)[]) => {
    let res = 0;
    for (let fn of sortBy) {
        res = fn(b) - fn(a);
        if (res !== 0) {
            break;
        }
    }
    return res;
};


const sortFormatsByVideo = (a: AVFormat, b: AVFormat) => sortFormatsBy(a, b, [
    (format: AVFormat) => parseInt(format.qualityLabel ?? ""),
    getVideoBitrate,
    getVideoEncodingRank,
]);


const sortFormatsByAudio = (a: AVFormat, b: AVFormat) => sortFormatsBy(a, b, [
    getAudioBitrate,
    getAudioEncodingRank,
]);


/**
 * Sort formats from highest quality to lowest.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export const sortFormats = (a: AVFormat, b: AVFormat) => sortFormatsBy(a, b, [
    // Formats with both video and audio are ranked highest.
    format => +!!format.isHLS,
    format => +!!format.isDashMPD,
    format => +(parseInt(format.contentLength ?? "") > 0),
    format => +(format.hasVideo && format.hasAudio),
    format => +format.hasVideo,
    format => parseInt(format.qualityLabel ?? "") || 0,
    getVideoBitrate,
    getAudioBitrate,
    getVideoEncodingRank,
    getAudioEncodingRank,
]);


/**
 * Choose a format depending on the given options.
 *
 * @param {Array.<Object>} formats
 * @param {Object} options
 * @returns {Object}
 * @throws {Error} when no format matches the filter/format rules
 */
export const chooseFormat = (formats: AVFormat[], options: DownloadOptions) => {
    if (typeof options.format === 'object') {
        if (!options.format.url) {
            throw Error('Invalid format given, did you use `ytdl.getInfo()`?');
        }
        return options.format;
    }
    options.filter
    if (options.filter) {
        formats = filterFormats(formats, options.filter);
    }

    // We currently only support HLS-Formats for livestreams
    // So we (now) remove all non-HLS streams
    formats = formats.filter((fmt) => !fmt.isHLS);
    formats = formats.filter((fmt) => !fmt.isLive);

    let format;
    const quality = options.quality || 'highest';
    switch (quality) {
        case 'highest': {
            format = formats[0];
            break;
        }
        case 'lowest': {
            format = formats[formats.length - 1];
            break;
        }
        case 'highestaudio': {
            formats = filterFormats(formats, 'audio');
            formats.sort(sortFormatsByAudio);
            // Filter for only the best audio format
            const bestAudioFormat = formats[0];
            formats = formats.filter(f => sortFormatsByAudio(bestAudioFormat, f) === 0);
            // Check for the worst video quality for the best audio quality and pick according
            // This does not loose default sorting of video encoding and bitrate
            const worstVideoQuality = formats.map(f => parseInt(f.qualityLabel) || 0).sort((a, b) => a - b)[0];
            format = formats.find(f => (parseInt(f.qualityLabel) || 0) === worstVideoQuality);
            break;
        }
        case 'lowestaudio': {
            formats = filterFormats(formats, 'audio');
            formats.sort(sortFormatsByAudio);
            format = formats[formats.length - 1];
            break;
        }
        case 'highestvideo': {
            formats = filterFormats(formats, 'video');
            formats.sort(sortFormatsByVideo);
            // Filter for only the best video format
            const bestVideoFormat = formats[0];
            formats = formats.filter(f => sortFormatsByVideo(bestVideoFormat, f) === 0);
            // Check for the worst audio quality for the best video quality and pick according
            // This does not loose default sorting of audio encoding and bitrate
            const worstAudioQuality = formats.map(f => f.audioBitrate || 0).sort((a, b) => a - b)[0];
            format = formats.find(f => (f.audioBitrate || 0) === worstAudioQuality);
            break;
        }
        case 'lowestvideo': {
            formats = filterFormats(formats, 'video');
            formats.sort(sortFormatsByVideo);
            format = formats[formats.length - 1];
            break;
        }
        default: {
            format = getFormatByQuality(quality as string|string[], formats);
            break;
        }
    }

    if (!format) {
        throw Error(`No such format found: ${quality}`);
    }
    return format;
};

/**
 * Gets a format based on quality or array of quality's
 *
 * @param {string|[string]} quality
 * @param {[Object]} formats
 * @returns {Object}
 */
const getFormatByQuality = (quality: string|string[], formats: AVFormat[]) => {
    let getFormat = (itag: string) => formats.find(format => `${format.itag}` === `${itag}`);
    if (Array.isArray(quality)) {
        return getFormat(quality.find(q => getFormat(q)) ?? "");
    } else {
        return getFormat(quality);
    }
};


/**
 * @param {Array.<Object>} formats
 * @param {Function} filter
 * @returns {Array.<Object>}
 */
export const filterFormats = (formats: AVFormat[], filter: Filter) => {
    let fn: (fmts: AVFormat) => boolean;
    switch (filter) {
        case 'videoandaudio':
        case 'audioandvideo':
            fn = (format: AVFormat) => format.hasVideo && (format.hasAudio || (format.mimeType?.includes("audio") ?? false));
            break;
        case 'video':
            fn = (format: AVFormat) => format.hasVideo;
            break;
        case 'videoonly':
            fn = (format: AVFormat) => format.hasVideo && !format.hasAudio;
            break;
        case 'audio':
            fn = (format: AVFormat) => format.hasAudio || (format.mimeType?.includes("audio") ?? false);
            break;
        case 'audioonly':
            fn = (format: AVFormat) => !format.hasVideo && (format.hasAudio || (format.mimeType?.includes("audio") ?? false));
            break;
        default:
            if (typeof filter === 'function') {
                fn = filter;
            } else {
                throw TypeError(`Given filter (${filter}) is not supported`);
            }
    }
    return formats.filter(format => !!format.url && fn(format));
};


/**
 * @param {Object} format
 * @returns {Object}
 */
export const addFormatMeta = (format: AVFormat) => {
    format = Object.assign({}, FORMATS[format.itag], format);
    format.hasVideo = !!format.qualityLabel;
    format.hasAudio = !!format.audioBitrate;
    format.container = (format.mimeType ?
        (format.mimeType.split(';')[0].split('/')[1] as any) : null);
    format.codecs = (format.mimeType ?
        utils.between(format.mimeType, 'codecs="', '"') : null) as string;
    format.videoCodec = format.hasVideo && format.codecs ?
        format.codecs.split(', ')[0] : undefined;
    format.audioCodec = format.hasAudio && format.codecs ?
        format.codecs.split(', ').slice(-1)[0] : undefined;
    format.isLive = /\bsource[/=]yt_live_broadcast\b/.test(format.url);
    format.isHLS = /\/manifest\/hls_(variant|playlist)\//.test(format.url);
    format.isDashMPD = /\/manifest\/dash\//.test(format.url);
    return format;
};
