import React, { useState } from 'react';
import { StyleSheet, View, Button, TextInput, NativeModules } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';
// const { ThrowErrModule } = NativeModules

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [revision, setRevision] = useState('testRevisionExpo123');
  const [contextValue, setContextValue] = useState('');
  
  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey)
    Honeybadger.configure({
      apiKey, 
      revision,
      debug: true,
      reportData: true, // report data even in dev environment
    })
  }

  function onSetContextButtonPress() {
    console.log('Setting context:', contextValue)
    Honeybadger.setContext({ testContextKey: contextValue })
  }

  function onErrButtonPress() {
    throw ( new Error('This is a test error from the react-native expo-app example project!') );
  }

  function onNotifyButtonPress() {
    Honeybadger.notify(new Error('This is a test notify() from the react-native-cli example project'), {})
  }

  // TODO
  // function onNativeErrPress() {
  //   ThrowErrModule.throwErr()
  // }

  return (
    <View style={styles.container}>
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
      <Button onPress={onErrButtonPress} title="Throw a JS error!" />
      <Button onPress={onNotifyButtonPress} title="Honeybader.notify()" />
      {/* <Button onPress={onNativeErrPress} title="Throw a native error" /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
