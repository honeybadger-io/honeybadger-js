/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { SafeAreaView, Button, TextInput } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';

export default function App() {
  const [apiKey, setApiKey] = useState('');

  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey);
    Honeybadger.configure(apiKey);
  }
  function onErrButtonPress() {
    throw new Error(
      'This is a test error from the react-native example project!',
    );
  }

  return (
    <SafeAreaView>
      <TextInput
        placeholder="enter your API key"
        value={apiKey}
        onChangeText={text => setApiKey(text)}
      />
      <Button onPress={onConfigureButtonPress} title="Configure HB" />
      <Button onPress={onErrButtonPress} title="Throw an error!" />
    </SafeAreaView>
  );
}
