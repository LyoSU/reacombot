const Composer = require('telegraf/composer')
const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const { match } = require('telegraf-i18n')
const {
  scenes
} = require('../middlewares')
const {
  getChannel,
  findEmojis
} = require('../helpers')

const composer = new Composer()

const channelControl = new Scene('channelControl')

channelControl.enter(async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)
  const channelChat = await ctx.tg.getChat(channel.channelId).catch(error => { return { error } })

  if (channelChat.error) {
    channel.available = false
    await channel.save()
    return ctx.replyWithHTML(ctx.i18n.t('channels.control.no_available'))
  }

  const inlineKeyboard = [
    [
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.emoji', { channel }), `channel:${channel.id}:emoji`),
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.links', { channel }), `channel:${channel.id}:links`)
    ],
    [
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.type'), `channel:${channel.id}:type:0`),
      Markup.callbackButton(ctx.i18n.t('channels.control.menu.comments_type'), `channel:${channel.id}:comments_type:0`)
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

  const emojis = findEmojis(ctx.message.text)
  channel.settings.emojis = emojis.join('')
  if (channel.settings.emojis.length <= 0) channel.settings.emojis = new ctx.db.Channel().settings.emojis
  await channel.save()

  return ctx.scene.enter(channelControl.id, {
    channelId: ctx.scene.state.channelId
  })
})

const setChannelLinks = new Scene('setChannelLinks')

setChannelLinks.enter(async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)

  await ctx.editMessageText(ctx.i18n.t('channels.control.links.send_links'), {
    reply_markup: Markup.inlineKeyboard(channel.settings.keyboard),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  })
})

setChannelLinks.on('text', async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.scene.state.channelId)

  const inlineKeyboard = []

  ctx.message.text.split('\n').forEach((line) => {
    const linelButton = []

    line.split('|').forEach((row) => {
      const data = row.split(' - ')
      if (data[0] && data[1]) {
        const name = data[0].trim()
        const url = data[1].trim()

        linelButton.push(Markup.urlButton(name, url))
      }
    })

    inlineKeyboard.push(linelButton)
  })

  channel.settings.keyboard = inlineKeyboard
  await channel.save()

  await ctx.replyWithHTML(ctx.i18n.t('channels.control.links.success'))

  return ctx.scene.enter(channelControl.id, {
    channelId: ctx.scene.state.channelId
  })
})

composer.use(scenes(
  channelControl,
  setChannelEmoji,
  setChannelLinks
))

composer.action(/channel:(.*):emoji/, async ctx => {
  return ctx.scene.enter(setChannelEmoji.id, {
    channelId: ctx.match[1]
  })
})

composer.action(/channel:(.*):links/, async ctx => {
  return ctx.scene.enter(setChannelLinks.id, {
    channelId: ctx.match[1]
  })
})

composer.action(/channel:(.*):type:(.*)/, async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.match[1])

  const types = ['always', 'one', 'never', 'request']

  if (types.indexOf(ctx.match[2]) >= 0) channel.settings.type = ctx.match[2]
  await channel.save()

  const inlineKeyboard = []

  inlineKeyboard.push(types.map(type => {
    const selectedMark = channel.settings.type === type ? '✅ ' : ''
    return Markup.callbackButton(selectedMark + ctx.i18n.t(`channels.control.types.menu.${type}`), `channel:${channel.id}:type:${type}`)
  }))

  inlineKeyboard.push([Markup.callbackButton(ctx.i18n.t('channels.back'), `channel:${channel.id}`)])

  await ctx.editMessageText(ctx.i18n.t('channels.control.types.info', {
    channel
  }), {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard(inlineKeyboard)
  })
})

composer.action(/channel:(.*):comments_type:(.*)/, async ctx => {
  const channel = await ctx.db.Channel.findById(ctx.match[1])

  const types = ['always', 'one', 'never']

  if (types.indexOf(ctx.match[2]) >= 0) channel.settings.commentsType = ctx.match[2]
  await channel.save()

  const inlineKeyboard = []

  inlineKeyboard.push(types.map(type => {
    const selectedMark = channel.settings.commentsType === type ? '✅ ' : ''
    return Markup.callbackButton(selectedMark + ctx.i18n.t(`channels.control.comments_types.menu.${type}`), `channel:${channel.id}:comments_type:${type}`)
  }))

  inlineKeyboard.push([Markup.callbackButton(ctx.i18n.t('channels.back'), `channel:${channel.id}`)])

  await ctx.editMessageText(ctx.i18n.t('channels.control.comments_types.info', {
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
  const channels = await ctx.db.Channel.find({
    'administrators.user': ctx.from.id,
    available: { $ne: 'false' }
  })

  if (channels.length <= 0) return ctx.replyWithHTML(ctx.i18n.t('channels.not_found'))

  const inlineKeyboard = []

  channels.forEach(channel => {
    inlineKeyboard.push(Markup.callbackButton(channel.title, `channel:${channel.id}`))
  })

  await ctx.replyWithHTML(ctx.i18n.t('channels.select'), {
    reply_markup: Markup.inlineKeyboard(inlineKeyboard, {
      columns: 2
    })
  })
}

composer.hears(match('menu.channels'), Composer.privateChat(channels))
composer.command('channels', Composer.privateChat(channels))

composer.on('forward', Composer.privateChat(async (ctx, next) => {
  if (ctx.message.forward_from_chat.type !== 'channel') return next()
  await getChannel(ctx.message.forward_from_chat)
  await ctx.replyWithHTML(ctx.i18n.t('channels.updated'))
}))

module.exports = composer
