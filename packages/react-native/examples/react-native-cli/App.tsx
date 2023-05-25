/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { SafeAreaView, Button, TextInput, NativeModules, Text } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';
const { ThrowErrModule } = NativeModules

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [revision, setRevision] = useState('testRevisionCli123');
  const [contextValue, setContextValue] = useState('');
  const [lastNoticeId, setLastNoticeId] = useState('')

  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey);
    Honeybadger.configure({
      apiKey, 
      revision,
      debug: true,
      reportData: true, // report data even in dev environment, 
      breadcrumbsEnabled: true,
    })
    Honeybadger.beforeNotify((notice) => {
      if (notice) {
        notice.context.beforeNotifyRan = true
      }
    })
    Honeybadger.afterNotify((err, notice) => {
      if (err) {
        setLastNoticeId(`Error: ${err}`)
      } else {
        setLastNoticeId(notice?.id || '')
      }
    })
  }

  function onSetContextButtonPress() {
    console.log('Setting context:', contextValue)
    Honeybadger.setContext({ testContextKey: contextValue })
  }

  function onAddBreadcrumbButtonPress() {
    console.log('Adding breadcrumb')
    Honeybadger.addBreadcrumb('Test Breadcrumb', { 
      category: 'custom', 
      metadata: { timestamp: Date.now() }, 
    })
  }

  function onClearButtonPress() {
    console.log('calling Honeybadger.clear()')
    Honeybadger.clear()
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
      <TextInput
        placeholder="enter a test context value"
        value={contextValue}
        onChangeText={(text) => setContextValue(text)}
      />

      <Button onPress={onConfigureButtonPress} title="Configure HB" />
      <Button onPress={onSetContextButtonPress} title="Set context" />
      <Button onPress={onAddBreadcrumbButtonPress} title="Add breadcrumb" />
      <Button onPress={onClearButtonPress} title="Clear" />
      <Button onPress={onErrButtonPress} title="Throw a JS error!" />
      <Button onPress={onNotifyButtonPress} title="Honeybader.notify()" />
      <Button onPress={onNativeErrPress} title="Throw a native error" />

      <Text>Last notice ID: </Text>
      <Text>{lastNoticeId}</Text>
    </SafeAreaView>
  );
}