import { is_app_link } from '@utils/app_links';
import type { NativeIntent } from 'expo-router';

export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path, initial }) => {
	if (!is_app_link(path)) return path;
	return initial ? '/' : null;
};
