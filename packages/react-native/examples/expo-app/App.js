import React, { useState } from 'react';
import { StyleSheet, View, Button, TextInput } from 'react-native';
import Honeybadger from '@honeybadger-io/react-native';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [revision, setRevision] = useState('testRevisionExpo123');
  
  function onConfigureButtonPress() {
    console.log('Configuring HB with API key:', apiKey)
    Honeybadger.configure(
      apiKey, 
      true,
      revision,
    )
    Honeybadger.setLogLevel('debug')
  }
  function onErrButtonPress() {
    throw ( new Error('This is a test error from the react-native expo-app example project!') );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="enter your API key"
        value={apiKey}
        onChangeText={(text) => setApiKey(text)}
      />
      <TextInput
        placeholder="enter your revision"
        value={revision}
        onChangeText={(text) => setRevision(text)}
      />
      <Button onPress={ onConfigureButtonPress } title="Configure HB" />
      <Button onPress={ onErrButtonPress } title="Throw an error!" />
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
