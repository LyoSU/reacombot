const Composer = require('telegraf/composer')
const Markup = require('telegraf/markup')

const help = async ctx => {
  await ctx.replyWithHTML(ctx.i18n.t('help'), Markup.keyboard([
    [
      ctx.i18n.t('menu.channels')
    ]
  ]).resize().extra({ disable_web_page_preview: true }))
}

const composer = new Composer()

composer.use(Composer.privateChat((ctx, next) => {
  if (ctx.state.sendHelp) return help(ctx, next)
  else return next()
}))
composer.on('message', Composer.privateChat(help))

module.exports = composer
