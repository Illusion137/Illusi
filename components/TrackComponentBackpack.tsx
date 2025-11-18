import React, {useState} from 'react';
import type { Track } from '@illusive/types';
import { SQLBackpack } from '@illusive/sql/sql_backpack';
import usePTheme from '@hooks/usePTheme';
import TrackComponentBase from './TrackComponentBase';
import { IoniconsTouchableOpacity } from './TouchableIconOpacity';

export default function TrackComponentBackpack(props: {
	track_data: Track,
}) {
	const { colors } = usePTheme();
	const [disabled, set_disabled] = useState(false)

	async function on_swap(){
		set_disabled(true);
		await SQLBackpack.toss_from_backpack(props.track_data);
	}

	return (
		<TrackComponentBase track_data={props.track_data}
			disabled={true}
			on_press={undefined} on_long_press={() => {}} >
			{ !disabled ? <IoniconsTouchableOpacity icon_name='swap-horizontal' icon_size={24} icon_color={colors.primary}
				style={{alignSelf:'center', left: 20, padding: 10}} 
				on_press={on_swap}/> : null }
		</TrackComponentBase>
	);
}