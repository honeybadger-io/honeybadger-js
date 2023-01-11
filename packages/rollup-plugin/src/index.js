import writeBundle from './writeBundle'

export default function honeybadgerRollupPlugin() {
  return {
    name: 'honeybadger', 
    writeBundle
  }
}