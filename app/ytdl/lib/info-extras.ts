import * as utils from './utils';
import * as qs from 'querystring';
import { parseTimestamp } from './PATCH/m3u8stream/index';

const BASE_URL = 'https://www.youtube.com/watch?v=';
const TITLE_TO_CATEGORY: Record<string, {"name": string, url: string}> = {
    song: { name: 'Music', url: 'https://music.youtube.com/' },
};

const getText = (obj: any) => obj ? obj.runs ? obj.runs[0].text : obj.simpleText : null;


/**
 * Get video media.
 *
 * @param {Object} info
 * @returns {Object}
 */
export const getMedia = (info: any) => {
    let media: any = {};
    let results = [];
    try {
        results = info.response.contents.twoColumnWatchNextResults.results.results.contents;
    } catch (err) {
        // Do nothing
    }

    let result: any = results.find((v: any) => v.videoSecondaryInfoRenderer);
    if (!result) { return {}; }

    try {
        let metadataRows =
            (result.metadataRowContainer || result.videoSecondaryInfoRenderer.metadataRowContainer)
                .metadataRowContainerRenderer.rows;
        for (let row of metadataRows) {
            if (row.metadataRowRenderer) {
                let title = getText(row.metadataRowRenderer.title).toLowerCase();
                let contents = row.metadataRowRenderer.contents[0];
                media[title] = getText(contents);
                let runs = contents.runs;
                if (runs && runs[0].navigationEndpoint) {
                    media[`${title}_url`] = new URL(
                        runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
                }
                if (title in TITLE_TO_CATEGORY) {
                    media.category = TITLE_TO_CATEGORY[title].name;
                    media.category_url = TITLE_TO_CATEGORY[title].url;
                }
            } else if (row.richMetadataRowRenderer) {
                let contents: any[] = row.richMetadataRowRenderer.contents;
                let boxArt = contents
                    .filter(meta => meta.richMetadataRenderer.style === 'RICH_METADATA_RENDERER_STYLE_BOX_ART');
                for (let { richMetadataRenderer } of boxArt) {
                    let meta = richMetadataRenderer;
                    media.year = getText(meta.subtitle);
                    let type = getText(meta.callToAction).split(' ')[1];
                    media[type] = getText(meta.title);
                    media[`${type}_url`] = new URL(
                        meta.endpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
                    media.thumbnails = meta.thumbnail.thumbnails;
                }
                let topic = contents
                    .filter(meta => meta.richMetadataRenderer.style === 'RICH_METADATA_RENDERER_STYLE_TOPIC');
                for (let { richMetadataRenderer } of topic) {
                    let meta = richMetadataRenderer;
                    media.category = getText(meta.title);
                    media.category_url = new URL(
                        meta.endpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
                }
            }
        }
    } catch (err) {
        // Do nothing.
    }

    return media;
};


const isVerified = (badges: any[]) => !!(badges && badges.find(b => b.metadataBadgeRenderer.tooltip === 'Verified'));


/**
 * Get video author.
 *
 * @param {Object} info
 * @returns {Object}
 */
export const getAuthor = (info: any) => {
    let channelId, thumbnails: any[] = [], subscriberCount, verified = false;
    try {
        let results: any[] = info.response.contents.twoColumnWatchNextResults.results.results.contents;
        let v = results.find(v2 =>
            v2.videoSecondaryInfoRenderer &&
            v2.videoSecondaryInfoRenderer.owner &&
            v2.videoSecondaryInfoRenderer.owner.videoOwnerRenderer);
        let videoOwnerRenderer = v.videoSecondaryInfoRenderer.owner.videoOwnerRenderer;
        channelId = videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
        thumbnails = (videoOwnerRenderer.thumbnail.thumbnails as any[]).map(thumbnail => {
            thumbnail.url = new URL(thumbnail.url, BASE_URL).toString();
            return thumbnail;
        });
        subscriberCount = utils.parseAbbreviatedNumber(getText(videoOwnerRenderer.subscriberCountText));
        verified = isVerified(videoOwnerRenderer.badges);
    } catch (err) {
        // Do nothing.
    }
    try {
        let videoDetails = info.player_response.microformat && info.player_response.microformat.playerMicroformatRenderer;
        let id = (videoDetails && videoDetails.channelId) || channelId || info.player_response.videoDetails.channelId;
        let author = {
            id: id,
            name: videoDetails ? videoDetails.ownerChannelName : info.player_response.videoDetails.author,
            user: videoDetails ? videoDetails.ownerProfileUrl.split('/').slice(-1)[0] : null,
            channel_url: `https://www.youtube.com/channel/${id}`,
            external_channel_url: videoDetails ? `https://www.youtube.com/channel/${videoDetails.externalChannelId}` : '',
            user_url: videoDetails ? new URL(videoDetails.ownerProfileUrl, BASE_URL).toString() : '',
            thumbnails,
            verified,
            subscriber_count: subscriberCount,
        };
        if (thumbnails.length) {
            utils.deprecate(author, 'avatar', author.thumbnails[0].url, 'author.avatar', 'author.thumbnails[0].url');
        }
        return author;
    } catch (err) {
        return {};
    }
};

const parseRelatedVideo = (details: any, rvsParams: any) => {
    if (!details) return;
    try {
        let viewCount = getText(details.viewCountText);
        let shortViewCount = getText(details.shortViewCountText);
        let rvsDetails = (rvsParams as any[]).find(elem => elem.id === details.videoId);
        if (!/^\d/.test(shortViewCount)) {
            shortViewCount = (rvsDetails && rvsDetails.short_view_count_text) || '';
        }
        viewCount = (/^\d/.test(viewCount) ? viewCount : shortViewCount).split(' ')[0];
        let browseEndpoint = details.shortBylineText.runs[0].navigationEndpoint.browseEndpoint;
        let channelId = browseEndpoint.browseId;
        let name = getText(details.shortBylineText);
        let user = (browseEndpoint.canonicalBaseUrl || '').split('/').slice(-1)[0];
        let video = {
            id: details.videoId,
            title: getText(details.title),
            published: getText(details.publishedTimeText),
            author: {
                id: channelId,
                name,
                user,
                channel_url: `https://www.youtube.com/channel/${channelId}`,
                user_url: `https://www.youtube.com/user/${user}`,
                thumbnails: (details.channelThumbnail.thumbnails as any[]).map(thumbnail => {
                    thumbnail.url = new URL(thumbnail.url, BASE_URL).toString();
                    return thumbnail;
                }),
                verified: isVerified(details.ownerBadges),

                [Symbol.toPrimitive]() {
                    console.warn(`\`relatedVideo.author\` will be removed in a near future release, ` +
                        `use \`relatedVideo.author.name\` instead.`);
                    return video.author.name;
                },

            },
            short_view_count_text: shortViewCount.split(' ')[0],
            view_count: viewCount.replace(/,/g, ''),
            length_seconds: details.lengthText ?
                Math.floor(parseTimestamp(getText(details.lengthText)) / 1000) :
                rvsParams && `${rvsParams.length_seconds}`,
            thumbnails: details.thumbnail.thumbnails,
            richThumbnails:
                details.richThumbnail ?
                    details.richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails : [],
            isLive: !!(details.badges && (details.badges as any[]).find(b => b.metadataBadgeRenderer.label === 'LIVE NOW')),
        };

        utils.deprecate(video, 'author_thumbnail', video.author.thumbnails[0].url,
            'relatedVideo.author_thumbnail', 'relatedVideo.author.thumbnails[0].url');
        utils.deprecate(video, 'ucid', video.author.id, 'relatedVideo.ucid', 'relatedVideo.author.id');
        utils.deprecate(video, 'video_thumbnail', video.thumbnails[0].url,
            'relatedVideo.video_thumbnail', 'relatedVideo.thumbnails[0].url');
        return video;
    } catch (err) {
        // Skip.
    }
};

/**
 * Get related videos.
 *
 * @param {Object} info
 * @returns {Array.<Object>}
 */
export const getRelatedVideos = (info: any) => {
    let rvsParams: any[] = [], secondaryResults = [];
    try {
        rvsParams = (info.response.webWatchNextResponseExtensionData.relatedVideoArgs as string).split(',').map(e => qs.parse(e));
    } catch (err) {
        // Do nothing.
    }
    try {
        secondaryResults = info.response.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;
    } catch (err) {
        return [];
    }
    let videos: ReturnType<typeof parseRelatedVideo>[] = [];
    for (let result of secondaryResults as any[] || []) {
        let details = result.compactVideoRenderer;
        if (details) {
            let video = parseRelatedVideo(details, rvsParams);
            if (video) videos.push(video);
        } else {
            let autoplay = result.compactAutoplayRenderer || result.itemSectionRenderer;
            if (!autoplay || !Array.isArray(autoplay.contents)) continue;
            for (let content of autoplay.contents) {
                let video = parseRelatedVideo(content.compactVideoRenderer, rvsParams);
                if (video) videos.push(video);
            }
        }
    }
    return videos;
};

/**
 * Get like count.
 *
 * @param {Object} info
 * @returns {number}
 */
export const getLikes = (info: any) => {
    try {
        let contents: any[] = info.response.contents.twoColumnWatchNextResults.results.results.contents;
        let video = contents.find(r => r.videoPrimaryInfoRenderer);
        let buttons: any[] = video.videoPrimaryInfoRenderer.videoActions.menuRenderer.topLevelButtons;
        let accessibilityText = buttons.find(b => b.segmentedLikeDislikeButtonViewModel).segmentedLikeDislikeButtonViewModel
            .likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel.toggleButtonViewModel
            .defaultButtonViewModel.buttonViewModel.accessibilityText;
        return parseInt(accessibilityText.match(/[\d,.]+/)[0].replace(/\D+/g, ''));
    } catch (err) {
        return null;
    }
};

/**
 * Cleans up a few fields on `videoDetails`.
 *
 * @param {Object} videoDetails
 * @param {Object} info
 * @returns {Object}
 */
export const cleanVideoDetails = (videoDetails: any, info: any) => {
    videoDetails.thumbnails = videoDetails.thumbnail.thumbnails;
    delete videoDetails.thumbnail;
    utils.deprecate(videoDetails, 'thumbnail', { thumbnails: videoDetails.thumbnails },
        'videoDetails.thumbnail.thumbnails', 'videoDetails.thumbnails');
    videoDetails.description = videoDetails.shortDescription || getText(videoDetails.description);
    delete videoDetails.shortDescription;
    utils.deprecate(videoDetails, 'shortDescription', videoDetails.description,
        'videoDetails.shortDescription', 'videoDetails.description');

    // Use more reliable `lengthSeconds` from `playerMicroformatRenderer`.
    videoDetails.lengthSeconds =
        (info.player_response.microformat &&
            info.player_response.microformat.playerMicroformatRenderer.lengthSeconds) ||
        info.player_response.videoDetails.lengthSeconds;
    return videoDetails;
};

/**
 * Get storyboards info.
 *
 * @param {Object} info
 * @returns {Array.<Object>}
 */
export const getStoryboards = (info: any) => {
    const parts = info.player_response.storyboards &&
        info.player_response.storyboards.playerStoryboardSpecRenderer &&
        info.player_response.storyboards.playerStoryboardSpecRenderer.spec &&
        info.player_response.storyboards.playerStoryboardSpecRenderer.spec.split('|');

    if (!parts) return [];

    const url = new URL(parts.shift());

    return parts.map((part: string, i: string) => {
        let [
            thumbnailWidth,
            thumbnailHeight,
            thumbnailCount,
            columns,
            rows,
            interval,
            nameReplacement,
            sigh,
        ] = part.split('#');

        url.searchParams.set('sigh', sigh);

        const nthumbnailCount = parseInt(thumbnailCount, 10);
        const ncolumns = parseInt(columns, 10);
        const nrows = parseInt(rows, 10);

        const storyboardCount = Math.ceil(nthumbnailCount / (ncolumns * nrows));

        return {
            templateUrl: url.toString().replace('$L', i).replace('$N', nameReplacement),
            thumbnailWidth: parseInt(thumbnailWidth, 10),
            thumbnailHeight: parseInt(thumbnailHeight, 10),
            nthumbnailCount,
            interval: parseInt(interval, 10),
            ncolumns,
            nrows,
            storyboardCount,
        };
    });
};

/**
 * Get chapters info.
 *
 * @param {Object} info
 * @returns {Array.<Object>}
 */
export const getChapters = (info: any) => {
    const playerOverlayRenderer = info.response &&
        info.response.playerOverlays &&
        info.response.playerOverlays.playerOverlayRenderer;
    const playerBar = playerOverlayRenderer &&
        playerOverlayRenderer.decoratedPlayerBarRenderer &&
        playerOverlayRenderer.decoratedPlayerBarRenderer.decoratedPlayerBarRenderer &&
        playerOverlayRenderer.decoratedPlayerBarRenderer.decoratedPlayerBarRenderer.playerBar;
    const markersMap = playerBar &&
        playerBar.multiMarkersPlayerBarRenderer &&
        playerBar.multiMarkersPlayerBarRenderer.markersMap;
    const marker = Array.isArray(markersMap) && markersMap.find(m => m.value && Array.isArray(m.value.chapters));
    if (!marker) return [];
    const chapters: any[] = marker.value.chapters;

    return chapters.map((chapter: any) => ({
        title: getText(chapter.chapterRenderer.title),
        start_time: chapter.chapterRenderer.timeRangeStartMillis / 1000,
    }));
};
