module.exports = (bot) => {
  const handlers = [
    'language',
    'channels',
    'help',
    'post',
    'rate'
  ]

  handlers.forEach((handler) => {
    bot.use(require(`./${handler}`))
  })
}
