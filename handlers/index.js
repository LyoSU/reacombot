module.exports = (bot) => {
  const handlers = [
    'language',
    'channels',
    'help',
    'post',
    'rate',
    'counter'
  ]

  handlers.forEach((handler) => {
    bot.use(require(`./${handler}`))
  })
}
