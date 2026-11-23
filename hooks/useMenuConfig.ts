import { useState } from 'react';
import type { MenuConfig } from '@components/ContextMenu';
import { catch_log } from '@common/utils/error_util';

/** A context menu config rebuilt each time the menu is about to show, so playback state is current;
 *  prefetch loads data the menu depends on and rebuilds it again when it resolves true */
export default function useMenuConfig(build: () => MenuConfig, prefetch?: () => Promise<boolean>) {
	const [menu_config, set_menu_config] = useState<MenuConfig>(build);
	function refresh_menu_config() {
		set_menu_config(build());
		prefetch?.().then((loaded) => {
			if (loaded) set_menu_config(build());
		}).catch(catch_log);
	}
	return [menu_config, refresh_menu_config] as const;
}
