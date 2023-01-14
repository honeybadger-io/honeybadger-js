const fs = require('fs');
const path = require('path');

const htmlFilePath = path.resolve(__dirname, '../assets/user-feedback-form.html')
const htmlData = fs.readFileSync(htmlFilePath, 'utf-8')
const jsFilePath = path.resolve(__dirname, '../assets/user-feedback-form.js')
let jsData = fs.readFileSync(jsFilePath, 'utf-8')
jsData = jsData.replace('$$TEMPLATE$$', htmlData)

const browserPath = path.resolve(__dirname, '../dist/browser')
if (!fs.existsSync(browserPath)) {
  console.error('Could not find dist/browser folder. Did you build?')
  process.exit(1)
}

fs.writeFileSync(path.resolve(browserPath, 'honeybadger-feedback-form.js'), jsData)

console.info('Generated feedback form assets')
