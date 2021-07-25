const Composer = require('telegraf/composer')
const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const { match } = require('telegraf-i18n')
const EmojiDbLib = require('emoji-db')
const {
  scenes
} = require('../middlewares')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

const composer = new Composer()

const channelControl = new Scene('channelControl')

channelControl.enter(async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)

  const inlineKeyboard = [
    [
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.emoji', { channel }), `channel:${channel.id}:emoji`)
    ],
    [
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.type'), `channel:${channel.id}:type:0`)
    ]
  ]

  if (ctx.updateType === 'message') {
    await ctx.replyWithHTML(ctx.i18n.t('channels.control.info', {
      channel
    }), {
      reply_markup: Markup.inlineKeyboard(inlineKeyboard)
    })
  } else if (ctx.updateType === 'callback_query') {
    await ctx.editMessageText(ctx.i18n.t('channels.control.info', {
      channel
    }), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: Markup.inlineKeyboard(inlineKeyboard)
    })
  }
})

const setChannelEmoji = new Scene('setChannelEmoji')

setChannelEmoji.enter(async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)

  await ctx.editMessageText(ctx.i18n.t('channels.control.emojis.send_emoji', {
    channel
  }), {
    parse_mode: 'HTML',
    disable_web_page_preview: true
  })
})

setChannelEmoji.on('text', async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)

  const emojis = emojiDb.searchFromText({ input: ctx.message.text, fixCodePoints: true })
  const emojisArray = emojis.map(data => data.emoji)
  channel.settings.emojis = emojisArray.join('')
  if (channel.settings.emojis.length <= 0) channel.settings.emojis = new ctx.db.Channel().settings.emojis
  await channel.save()

  return ctx.scene.enter(channelControl.id, {
    channelId: ctx.scene.state.channelId
  })
})

composer.use(scenes(
  channelControl,
  setChannelEmoji
))

composer.action(/channel:(.*):emoji/, async ctx => {
  return ctx.scene.enter(setChannelEmoji.id, {
    channelId: ctx.match[1]
  })
})

composer.action(/channel:(.*):type:(.*)/, async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.match[1])

  const types = ['always', 'one', 'never']

  if (types.indexOf(ctx.match[2]) >= 0) channel.settings.type = ctx.match[2]
  await channel.save()

  const inlineKeyboard = types.map(type => {
    const selectedMark = channel.settings.type === type ? '✅ ' : ''
    return Markup.callbackButton(selectedMark + ctx.i18n.t(`channels.control.types.menu.${type}`), `channel:${channel.id}:type:${type}`)
  })

  await ctx.editMessageText(ctx.i18n.t('channels.control.types.info', {
    channel
  }), {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard(inlineKeyboard)
  })
})

composer.action(/channel:(.*)/, async ctx => {
  return ctx.scene.enter(channelControl.id, {
    channelId: ctx.match[1]
  })
})

const channels = async ctx => {
  const channels = await ctx.db.Channel.find({ 'administrators.user': ctx.session.userInfo._id })

  if (channels.length <= 0) return ctx.replyWithHTML(ctx.i18n.t('channels.not_found'))

  const inlineKeyboard = []

  channels.forEach(channel => {
    inlineKeyboard.push([Markup.callbackButton(channel.title, `channel:${channel.id}`)])
  })

  await ctx.replyWithHTML(ctx.i18n.t('channels.select'), {
    reply_markup: Markup.inlineKeyboard(inlineKeyboard)
  })
}

composer.hears(match('menu.channel'), Composer.privateChat(channels))
composer.command('channels', Composer.privateChat(channels))

module.exports = composer
