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
  const [revision, setRevision] = useState('testRevisionCli123');

  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey);
    Honeybadger.configure({
      apiKey, 
      revision,
      debug: true,
    })
  }
  function onErrButtonPress() {
    throw new Error(
      'This is a test error from the react-native-cli example project!',
    );
  }
  function onNotifyButtonPress() {
    Honeybadger.notify(new Error('This is a test notify() from the react-native-cli example project'), {})
  }

  return (
    <SafeAreaView>
      <TextInput
        placeholder="enter your API key"
        value={apiKey}
        onChangeText={text => setApiKey(text)}
      />
      <TextInput
        placeholder="enter your revision"
        value={revision}
        onChangeText={(text) => setRevision(text)}
      />
      <Button onPress={onConfigureButtonPress} title="Configure HB" />
      <Button onPress={onErrButtonPress} title="Throw an error!" />
      <Button onPress={onNotifyButtonPress} title="Honeybader.notify()" />
    </SafeAreaView>
  );
}
