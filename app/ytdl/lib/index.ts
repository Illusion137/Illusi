import * as getInfo from './info';
import * as formatUtils from './format-utils';
import * as urlUtils from './url-utils';
import { downloadOptions } from '@distube/ytdl-core';
import { AVFormat } from './types';

export async function ytdl (link: string, options: downloadOptions): Promise<AVFormat> {
    const info = await ytdl.getInfo(link, options);
    const format = ytdl.chooseFormat(info.formats, options);
    return format;
};

ytdl.getBasicInfo = getInfo.getBasicInfo;
ytdl.getInfo = getInfo.getInfo;
ytdl.chooseFormat = formatUtils.chooseFormat;
ytdl.filterFormats = formatUtils.filterFormats;
ytdl.validateID = urlUtils.validateID;
ytdl.validateURL = urlUtils.validateURL;
ytdl.getURLVideoID = urlUtils.getURLVideoID;
ytdl.getVideoID = urlUtils.getVideoID;
ytdl.cache = {
    info: getInfo.cache,
    watch: getInfo.watchPageCache,
};