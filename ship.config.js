module.exports = {
  publishCommand: ({ defaultCommand, tag }) =>
   `${defaultCommand} --access public --tag ${tag}`,
  afterPublish: ({ exec }) => {
    exec(`./scripts/release-cdn.sh`)
  },
}
