// -----------------------------------------------------------------------------
//
// Honeybadger.io React Native
//
// Sample App
//
// -----------------------------------------------------------------------------


import React from 'react';
import { SafeAreaView, Button } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';


export default function App() {

	const HONEYBADGER_API_KEY = '<Your Honeybadger.io API key>'; // TODO
	Honeybadger.configure(HONEYBADGER_API_KEY);

	function onBtnClicked() {
		throw ( new Error('This is a test error!') );
	}

	return (
		<SafeAreaView>
			<Button onPress={ onBtnClicked } title="Click me!" />
		</SafeAreaView>
	);

}
