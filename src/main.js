import builder from './builder.js'

let factory = builder()
let singleton = factory()

singleton.factory = factory

export default singleton
