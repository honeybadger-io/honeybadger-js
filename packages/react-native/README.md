# Honeybadger for React Native
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact-native.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact-native)

A React Native library for integrating [Honeybadger](https://honeybadger.io) into your React Native iOS and Android apps.

## Installation

From the root directory of your React Native project:

```shell
npm install "@honeybadger-io/react-native"
cd ios && pod install
```

The above will download the Honeybadger React Native library and add it as a dependency of your project. The iOS step is required to properly add the library to the Xcode project through CocoaPods. Android doesn't require a separate step.

## Initialization

Add the following to your **App.js** file to initialize the Honeybadger library.

```js
import Honeybadger from "@honeybadger-io/react-native";

export default function App() {
  Honeybadger.configure("Your Honeybadger API key");
  // ...
}
```

You can log into your [Honeybadger](https://honeybadger.io) account to obtain your API key.


## Configuration

The configure method takes additional configuration options.

| Name | Type | Required | Default | Example | 
| ----- | ---- | ------- | ------- | ------- | 
| apiKey | String | YES | `""` | `"hb-api-key-1234"` |
| reportErrors | Boolean | NO | true |
| revision | String | NO | `""` | `"8afb34a"` |
| projectRoot | String | NO | `""` | `"/path/to/project"` |

```js
  Honeybadger.configure(
    "hb-api-key-1234",
    "8afb34a",
    "/path/to/project"
  );
```

The **reportErrors** parameter determines if errors are to be sent to Honeybadger. This is set to **true** by default. In certain environments, say, during development, it could be useful to set **reportErrors** to **false** to prevent errors from being posted to your Honeybadger account.


## Usage Examples

iOS, Android, and JavaScript errors will be automatically handled by the Honeybadger React Native library, by default. But you can also use the following API to customize error handling in your application.

### Honeybadger.notify(error, additionalData)

You can use the **notify** method to send any kind of error, exception, object, String, etc. If sending an error or exception, the Honeybadger React Native library will attempt to extract a stack trace and any relevant information that might be useful. You can also optionally provide **additionalData** to the **notify** method, as either a string or an object, to include any relevant information.

### Honeybadger.setContext(context)

If you have data that you would like to include whenever an error or an exception occurs, you can provide that data using the **setContext** method. Provide an object as an argument. You can call **setContext** as many times as needed. New context data will be merged with any previously-set context data.

```js
Honeybadger.setContext({
  user_id: "123abc",
  more: "some additional data",
});
```

### Honeybadger.resetContext()

If you've used **Honeybadger.setContext()** to store context data, you can use **Honeybadger.resetContext()** to clear that data.

### Honeybadger.setLogLevel(logLevel)

Sets the logging level for the Honeybadger library. 

```js
  Honeybadger.setLogLevel("debug");
```

The following values are accepted:

| Value | Meaning | 
| ----- | ---- | 
| "debug" | Everything will be logged to console. |
| "warning" | Only warnings will be logged to console. |
| "error" | Only errors will be logged to console. |


The default logging level is "warning".



## Source Maps

This package includes a script that will help you generate source maps for your project. To generate source maps for both iOS and Android, run the following from your project root directory.

```shell
npx honeybadger-generate-sourcemaps
```

The operation might take some time, as React Native needs to build production-ready bundles and their respective source map files for both iOS and Android. Upon completion, you will find the **sourcemap-ios** and **sourcemap-android** files in your project root directory. You can then [upload these files to Honeybadger](https://docs.honeybadger.io/lib/javascript/guides/using-source-maps.html) to view descriptive stack trace symbols in your production builds.

## Example Project

The **example** directory contains a minimal React Native project, demonstrating the use of the Honeybadger library. To run the project, first, open **App.js** and enter your Honeybadger API key. Once that's done, run the following:

```shell
npm install
cd ios ; pod install ; cd -
npx react-native start
npx react-native run-ios
```

## License

The Honeybadger React Native library is MIT-licensed. See the LICENSE file in this repository for details.
