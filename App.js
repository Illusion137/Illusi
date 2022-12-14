import React, { Component } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';

import PlayingSong from './app/components/PlayingSong';
import LibraryScreen from './app/screens/LibraryScreen';
import PlaylistScreen from './app/screens/PlaylistScreen';
import SearchScreen from './app/screens/SearchScreen';
import ExtraScreen from './app/screens/ExtraScreen';
import SearchHomeScreen from './app/screens/SearchHomeScreen'

import AddPlaylistFrom from './app/screens/subscreens/AddPlaylistFrom';
import GetAddPlaylistFrom from './app/screens/subscreens/GetAddPlaylistFrom';
import PlaylistSubScreen from './app/screens/subscreens/PlaylistSubScreen'
import ExtraRecoveryScreen from './app/screens/subscreens/ExtraRecoveryScreen';
import ExtraSettingsScreen from './app/screens/subscreens/ExtraSettingsScreen';
import PlaylistAddSearch from './app/screens/subscreens/PlaylistAddSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs([
	'Non-serializable values were found in the navigation state','Error evaluating injectedJavaScript:','react-native-ytdl is out of date!'
]);
const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Theme = {
	dark: false,
	colors: {
		primary: '#424ed4',
		background: '#000000',
		card: '#131213',
		text: '#FFFFFF',
		border: '#222222',
		notification: '#1313ff',
	},
};

export class Tabs extends Component {
	constructor (props){
		super(props);
	}
	render(){
		return (
			<Tab.Navigator initialRouteName={'Library'} 
			screenOptions={{headerShown: false, animation:'none', tabBarActiveTintColor: Theme.colors.primary, tabBarInactiveTintColor: '#808080', 
			tabBarActiveBackgroundColor:'#202020', tabBarInactiveBackgroundColor: '#202020', tabBarStyle:{backgroundColor:'#202020', height: 90, zIndex:1}}} 
			unmountInactiveScreens={true} detachInactiveScreens={true}>
				<Tab.Screen name="My Library" component={LibraryScreen}
				initialParams={{setPlaying: this.props.route.params.setPlaying}}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="library-sharp" size={30} color={color}/> ),
					unmountOnBlur: true,
				}}
				
				/>
				<Tab.Screen name="Playlists" component={PlaylistScreen}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="musical-notes" size={25} color={color}/>),
				}}
				/>
				<Tab.Screen name="Search" component={SearchHomeScreen}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="search" size={25} color={color}/>),
				}}
				/>
				<Tab.Screen name="Extras" component={ExtraScreen}
				options={{
					tabBarIcon: ({ color }) => ( <Entypo name="dots-three-horizontal" size={25} color={color}/>),
				}}
				/>
		  	</Tab.Navigator>
		);
	}
}
export default class App extends Component{
	state = {
		isPlaying: false,
		data: [],
		playlistName: '',
	}
	async componentDidMount() {
		await AsyncStorage.removeItem('DownloadQueue')
	}
	playVideo(data, playlistName){
		this.setState({data: data})
		this.setState({playlistName: playlistName})
		this.setState({isPlaying: false});
		this.setState({isPlaying: true});
	}
	render(){
		return (
			<NavigationContainer theme={Theme}>
					{this.state.isPlaying && <PlayingSong data={this.state.data} playlist={this.state.playlistName}/>}
					<Stack.Navigator>
						<Stack.Screen name="Tabs" component={Tabs} initialParams={{setPlaying: this.playVideo.bind(this)}} options={{headerShown: false}}/>
						<Stack.Screen name="PlaylistSubScreen" component={PlaylistSubScreen} options={{headerShown: false}}/>
						<Stack.Screen name="Add To Playlist" component={PlaylistAddSearch} options={{headerShown: true}} />
						<Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen}/>
						<Stack.Screen name="Settings" component={ExtraSettingsScreen}/>
						<Stack.Screen name="AddPlaylistFrom" component={AddPlaylistFrom}  options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: '#121212',} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: '#424ed4',
								headerRight: () => (
									<Button
										color='#808080'
										onPress={() => {}}
										title="Next"
									/>
									),
								})} />
						<Stack.Screen name="GetAddPlaylistFrom" component={GetAddPlaylistFrom} options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: '#121212',} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: 'blue',
								headerRight: () => (
									<Button
										color='#1313ff'
										onPress={() => ActionSheetIOS.showActionSheetWithOptions(
											{
											  options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'],
											  cancelButtonIndex: 0,
											  userInterfaceStyle: 'dark',
											  
											},
											(buttonIndex) => {
											  if (buttonIndex === 0) {
											  } else if (buttonIndex === 1) {
											  } else if (buttonIndex === 2) {
											  }
											}
										  )
									  }
										title="Save"
									/>
									),
								})}/>
					</Stack.Navigator>
			</NavigationContainer>
		);
	}
}
//headerShown: true, headerStyle: {backgroundColor: '#121212',},headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'