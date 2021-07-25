module.exports = (bot) => {
  const handlers = [
    'channels',
    'language',
    'help',
    'post',
    'rate',
    'counter'
  ]

  handlers.forEach((handler) => {
    bot.use(require(`./${handler}`))
  })
}
