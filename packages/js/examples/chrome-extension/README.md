# Honeybadger Chrome Extension Example

This example was built using the official [Getting Started tutorial from Chrome Developers](https://developer.chrome.com/docs/extensions/mv3/getstarted/).
Follow these steps to run the example:

## Setup

1. Download Honeybadger's browser client to `vendor/honeybadger.min.js`. You can do that by executing `sh setup.sh` inside `examples/chrome-extension` or by manually downloading from `js.honeybadger.io/v3.0/honeybadger.min.js`.  
2. Install the extension locally by navigating to `chrome://extensions` from your Chrome browser.
3. Enable `Developer Mode` by clicking the toggle switch next to <strong>Developer mode</strong>.
4. Click the <strong>Load unpacked</strong> button and select the extension directory (`honeybadger-js/examples/chrome-extension`).

The example comes with two pages, the main extension page (`popup.html`) and an options page (`option.html`).
The main page is shown by left clicking on the extension. To see the options page, right click on the extension and then click on <strong>Options</strong>.

## Reloading the extension (after making changes to the code)

In the <strong>Extensions</strong> page (`chrome://extensions`), click on the reload (↺) button.

## Report an error

To report an error:
1. Open `error-reporting.js` and replace `YOUR_API_KEY` with your Honeybadger.js API key.
2. Make sure to reload the extension (see above).
3. Open the Options page and click on the Report Error button.
4. Check your Honeybadger.js dashboard. The error should show up after a few seconds. 
