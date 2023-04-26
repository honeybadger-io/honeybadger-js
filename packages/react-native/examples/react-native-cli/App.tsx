/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { SafeAreaView, Button, TextInput, NativeModules } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';
const { ThrowErrModule } = NativeModules

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [revision, setRevision] = useState('testRevisionCli123');

  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey);
    Honeybadger.configure({
      apiKey, 
      revision,
      debug: true,
      reportData: true, // report data even in dev environment
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

  function onNativeErrPress() {
    ThrowErrModule.throwErr()
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
      <Button onPress={onErrButtonPress} title="Throw a JS error!" />
      <Button onPress={onNotifyButtonPress} title="Honeybader.notify()" />
      <Button onPress={onNativeErrPress} title="Throw a native error" />
    </SafeAreaView>
  );
}