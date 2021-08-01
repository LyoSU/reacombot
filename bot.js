const path = require('path')
const Telegraf = require('telegraf')
const session = require('telegraf/session')
const I18n = require('telegraf-i18n')
const io = require('@pm2/io')
const {
  db
} = require('./database')
const {
  stats
} = require('./middlewares')
const {
  getUser,
  getChannel
} = require('./helpers')

const rpsIO = io.meter({
  name: 'req/sec',
  unit: 'update'
})

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: false },
  handlerTimeout: 1
})

;(async () => {
  console.log(await bot.telegram.getMe())
})()

bot.use((ctx, next) => {
  next().catch((error) => {
    console.log('Oops', error)
  })
  return true
})

bot.use(stats)

bot.use((ctx, next) => {
  ctx.db = db
  return next()
})

bot.use((ctx, next) => {
  rpsIO.mark()
  ctx.telegram.oCallApi = ctx.telegram.callApi
  ctx.telegram.callApi = (method, data = {}) => {
    const startMs = new Date()
    return ctx.telegram.oCallApi(method, data).then((result) => {
      console.log(`end method ${method}:`, new Date() - startMs)
      return result
    })
  }
  return next()
})

bot.command('json', ({ replyWithHTML, message }) => replyWithHTML('<code>' + JSON.stringify(message, null, 2) + '</code>'))

const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: '-'
})

bot.use(i18n.middleware())

bot.use(session({
  getSessionKey: (ctx) => {
    if (ctx.from && ctx.chat) {
      return `${ctx.from.id}:${ctx.chat.id}`
    } else if (ctx.from && ctx.inlineQuery) {
      return `${ctx.from.id}:${ctx.from.id}`
    } else if (ctx.chat && ctx.chat.type === 'channel') {
      return `channel:${ctx.chat.id}`
    }
    return null
  }
}))

bot.use(async (ctx, next) => {
  if (ctx.from) await getUser(ctx)
  if (ctx.channelPost) {
    ctx.session.channelInfo = await getChannel(ctx.chat)
    ctx.session.channelInfo.available = true
  }

  if (ctx.callbackQuery) {
    ctx.state.answerCbQuery = []
  }
  return next(ctx).then(() => {
    if (ctx.session && ctx.session.userInfo) ctx.session.userInfo.save()
    if (ctx.session && ctx.session.channelInfo) ctx.session.channelInfo.save()
    if (ctx.callbackQuery) return ctx.answerCbQuery(...ctx.state.answerCbQuery)
  })
})

require('./handlers')(bot)

bot.use((ctx, next) => {
  ctx.state.emptyRequest = true
  return next()
})

db.connection.once('open', async () => {
  console.log('Connected to MongoDB')

  await bot.launch().then(() => {
    console.log('bot start polling')
  })
})
