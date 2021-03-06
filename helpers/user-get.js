module.exports = async ctx => {
  let user
  let newUser = false

  if (!ctx.session.userInfo) {
    user = await ctx.db.User.findOne({ telegramId: ctx.from.id })
  } else {
    user = ctx.session.userInfo
  }

  const now = Math.floor(new Date().getTime() / 1000)

  if (!user) {
    newUser = true
    user = new ctx.db.User()
    user.telegramId = ctx.from.id
    user.first_act = now
  }
  user.firstName = ctx.from.first_name
  user.lastName = ctx.from.last_name
  user.fullName = `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}`
  user.username = ctx.from.username
  user.updatedAt = new Date()

  if (ctx.chat.type === 'private') user.status = 'member'

  if (newUser) await user.save()

  ctx.session.userInfo = user

  if (ctx.session.userInfo.settings.locale) {
    ctx.i18n.locale(ctx.session.userInfo.settings.locale)
  } else if (ctx.i18n.languageCode !== '-' && ctx.chat.type === 'private') {
    ctx.session.userInfo.settings.locale = ctx.i18n.shortLanguageCode
  } else if (ctx.i18n.languageCode === '-' && ctx.chat.type !== 'private') {
    ctx.i18n.locale('en')
  }

  return true
}
