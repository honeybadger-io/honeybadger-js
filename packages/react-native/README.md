# Honeybadger for React Native
![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact-native.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact-native)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/react-native)](https://www.npmjs.com/package/@honeybadger-io/react-native)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/react-native)](https://www.npmjs.com/package/@honeybadger-io/react-native)

A React Native library for integrating [Honeybadger](https://honeybadger.io) into your React Native iOS and Android apps.

## Installation

From the root directory of your React Native project, add *@honeybadger-io/react-native* as a dependency:

```shell
npm install "@honeybadger-io/react-native"
cd ios && pod install
```

The iOS step is required to properly add the library to the Xcode project through CocoaPods. Android doesn't require a separate step.

## Initialization

Add the following to your **App.js** file to initialize the Honeybadger library.

```js
import Honeybadger from "@honeybadger-io/react-native";

export default function App() {
  Honeybadger.configure({
    apiKey: '[ YOUR API KEY HERE ]'
  })
  // ...
}
```

You can log into your [Honeybadger](https://app.honeybadger.io/) account to obtain your API key.


## Configuration
See the [Configuration Reference](https://docs.honeybadger.io/lib/javascript/reference/configuration/) for a full list of config options. 

## Usage

Uncaught iOS, Android, and JavaScript errors will be automatically reported to Honeybadger by default. 

You can also [report errors](https://docs.honeybadger.io/lib/javascript/guides/reporting-errors/) yourself using `Honeybadger.notify()`. 

Error reports can be [customized](https://docs.honeybadger.io/lib/javascript/guides/customizing-error-reports/), for example by using `Honeybadger.setContext()`, `Honeybadger.addBreadcrumb()`, and `Honeybadger.beforeNotify()`. 

### Limitations
Some native errors on Android may not be recorded if they cause an immediate crash of the app before the notice makes it to Honeybadger. 

## Source Maps
To generate and upload source maps to Honeybadger, use the following command:
```shell
npx honeybadger-upload-sourcemaps --apiKey <your project API key> --revision <build revision>
```

The `--apiKey` param is your Honeybadger API key for the project. The `--revision` param should match the revision param of the `Honeybadger.init` call inside your application. This is done so that reported errors are correctly matched up against the generated source maps.

As of version 0.70, React Native uses Hermes as the default JavaScript engine. The source maps tool assumes that your project uses Hermes. If you are building against an earlier version of React Native, or are explicitly not using Hermes, add the `--no-hermes` flag to the source maps tool, like so:

```shell
npx honeybadger-upload-sourcemaps --no-hermes --apiKey <your project API key> --revision <build revision>
```

If you just want to generate the source maps without uploading them to Honeybadger, you can use the `--skip-upload` flag.

```shell
npx honeybadger-upload-sourcemaps --skip-upload --apiKey <your project API key> --revision <build revision>
```


## Example Projects

The **examples** directory contains two minimal React Native projects, demonstrating the use of the Honeybadger library. One was created using the `React Native CLI Quickstart` instructions and one using the `Expo Go Quickstart` instructions from [react-native](https://reactnative.dev/docs/environment-setup). Please review those instructions, as you may need to install Android Studio, Xcode, etc. 

### react-native-cli
```shell
npm install
npm run ios:install
npm start
```
In a new shell:
```
npm run ios
```
or
```
npm run android
```

If you want to test a release (ie prod) build, use 
```shell
npm run ios:release
```
or
```shell
npm run android:release
```

### expo-app
Do not use `npx expo start`, since this relies on Expo Go, which [does not support custom native code](https://docs.expo.dev/bare/using-expo-client/). Instead, use the following commands:

```shell
npm install
npm run ios
```
or
```
npm install
npm run android
```

When the app opens, enter your API key, press "Configure", and then test your setup by using the button to throw an error. 

If you want to test a release (ie prod) build, use 
```shell
npm run ios:release
```
or
```shell
npm run android:release
```

### Development workflow
When developing the react-native package and testing against the example projects, you will need to change the dependency in the example project's `package.json`. Rather than `"@honeybadger-io/react-native": "latest"`, you'll want to generate a tarball of the `react-native` package and install it. For example:

In the `react-native` folder: 
```shell
npm run build && npm pack
```
This will generate a tarball. Install it in an example project by updating `package.json`, for example:
```json
"@honeybadger-io/react-native": "file:../../honeybadger-io-react-native-5.1.6.tgz"
```
Then run `npm install` within the example project. 

If you notice that your changes are not being picked up, there may be a caching issue. You can bust this by renaming the tarball to a unique name and re-installing it. 

## License

The Honeybadger React Native library is MIT-licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.
