module.exports = (bot) => {
  const handlers = [
    'channels',
    'language',
    'post',
    'rate',
    'counter',
    'help'
  ]

  handlers.forEach((handler) => {
    bot.use(require(`./${handler}`))
  })
}
