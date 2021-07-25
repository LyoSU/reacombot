const Stage = require('telegraf/stage')
const { match } = require('telegraf-i18n')

module.exports = (...stages) => {
  const stage = new Stage([].concat(...stages))

  stage.use((ctx, next) => {
    if (!ctx.session.scene) ctx.session.scene = {}
    return next()
  })

  const cancel = async (ctx, next) => {
    ctx.session.scene = null
    await ctx.scene.leave()
    return next()
  }

  stage.command(['help', 'start', 'channels', 'cancel', match('menu.channels')], cancel)
  stage.hears(match('menu.channels'), cancel)

  return stage
}
