const Composer = require('telegraf/composer')

const composer = new Composer()

composer.on('message', Composer.groupChat(async (ctx, next) => {
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.forward_from_chat && ctx.message.reply_to_message.from.id === 777000) {
    const channel = await ctx.db.Channel.findOne({ channelId: ctx.message.reply_to_message.forward_from_chat.id })
    const post = await ctx.db.Post.findOne({ channel, channelMessageId: ctx.message.reply_to_message.forward_from_message_id })
    if (!post) return next()

    post.commentsCount += 1
    post.keyboardNextUpdate = new Date()
    await post.save()
  }
  return next()
}))

module.exports = composer
