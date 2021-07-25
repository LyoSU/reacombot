module.exports = async ctx => {
  let channel = await ctx.db.Channel.findOne({ channelId: ctx.chat.id })

  if (!channel) {
    channel = new ctx.db.Channel()
    channel.channelId = ctx.chat.id
  }

  channel.title = ctx.chat.title
  channel.username = ctx.chat.username
  channel.settings = channel.settings || new ctx.db.Channel().settings

  channel.updatedAt = new Date()
  ctx.session.channelInfo = channel

  return true
}
