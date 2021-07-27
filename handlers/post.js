const Composer = require('telegraf/composer')
const EmojiDbLib = require('emoji-db')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

const composer = new Composer()

composer.on('channel_post', async (ctx, next) => {
  if (ctx.session.channelInfo.settings.type === 'never') return next()
  if (ctx.session.channelInfo.settings.type === 'one') ctx.session.channelInfo.settings.type = 'never'

  const chatAdministrators = await ctx.getChatAdministrators()

  ctx.session.channelInfo.administrators = []

  for (const admin of chatAdministrators) {
    const adminUser = await ctx.db.User.findOne({ telegramId: admin.user.id })

    if (adminUser) {
      ctx.session.channelInfo.administrators.push({
        user: adminUser._id,
        status: admin.status
      })
    }
  }

  const post = new ctx.db.Post()

  const votesRateArray = []
  const votesKeyboardArray = []

  const emojis = emojiDb.searchFromText({ input: ctx.session.channelInfo.settings.emojis, fixCodePoints: true })

  emojis.forEach(data => {
    votesRateArray.push({
      name: data.emoji,
      vote: []
    })
    votesKeyboardArray.push({
      text: data.emoji,
      callback_data: `rate:${data.emoji}`
    })
  })

  post.channel = ctx.session.channelInfo
  post.channelMessageId = ctx.channelPost.message_id
  post.rate = {
    votes: votesRateArray,
    score: 0
  }
  post.keyboard = post.channel.settings.keyboard

  await post.save()

  votesKeyboardArray.push({
    text: '💬 🕒',
    callback_data: 'post:wait'
  })

  const editMessage = await ctx.tg.editMessageReplyMarkup(ctx.channelPost.chat.id, ctx.channelPost.message_id, null, {
    inline_keyboard: [votesKeyboardArray].concat(post.keyboard)
  }).catch(error => { return { error } })

  if (editMessage.error && !ctx.channelPost.forward_from_message_id) {
    for (const admin of chatAdministrators) {
      const adminUser = await ctx.db.User.findOne({ telegramId: admin.user.id })

      if (adminUser) {
        ctx.i18n.locale(adminUser.settings.locale)
        await ctx.tg.sendMessage(admin.user.id, ctx.i18n.t('error.cant_edited'), {
          parse_mode: 'HTML'
        }).catch(() => {})
      }
    }
  }
})

composer.action('post:wait', async (ctx, next) => {
  ctx.state.answerCbQuery = [ctx.i18n.t('wait'), true]
})

composer.on('message', async (ctx, next) => {
  if (ctx.from.id === 777000 && ctx.message.forward_from_message_id) {
    const channel = await ctx.db.Channel.findOne({ channelId: ctx.message.forward_from_chat.id })
    const post = await ctx.db.Post.findOne({ channel, channelMessageId: ctx.message.forward_from_message_id })

    if (!post) return next()

    post.groupMessageId = ctx.message.message_id
    await post.save()

    if (channel.groupId !== ctx.message.chat.id) {
      channel.groupId = ctx.message.chat.id
      await channel.save()
    }

    const votesKeyboardArray = []

    post.rate.votes.forEach(react => {
      votesKeyboardArray.push({
        text: react.name,
        callback_data: `rate:${react.name}`
      })
    })

    votesKeyboardArray.push({
      text: '💬',
      url: `https://t.me/c/${ctx.message.chat.id.toString().substr(4)}/${channel.settings.showStart === 'top' ? 1 : 1000000}?thread=${ctx.message.message_id}`
    })

    await ctx.tg.editMessageReplyMarkup(ctx.message.forward_from_chat.id, ctx.message.forward_from_message_id, null, {
      inline_keyboard: [votesKeyboardArray].concat(post.keyboard)
    })
  } else {
    return next()
  }
})

module.exports = composer
