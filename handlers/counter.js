const Composer = require('telegraf/composer')

const composer = new Composer()

composer.on('message', Composer.groupChat(async (ctx, next) => {
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === 777000) {
    const post = await ctx.db.Post.findOne({ channelMessageId: ctx.message.reply_to_message.forward_from_message_id })
    if (!post) return next()

    post.commentsCount += 1
    await post.save()
  }
  return next()
}))

module.exports = composer
