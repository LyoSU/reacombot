module.exports = async ctx => {
  let newChannel = false
  let channel = await ctx.db.Channel.findOne({ channelId: ctx.chat.id })

  if (!channel) {
    newChannel = true
    channel = new ctx.db.Channel()
    channel.channelId = ctx.chat.id
  }
  channel.available = true

  channel.title = ctx.chat.title
  channel.username = ctx.chat.username
  channel.settings = channel.settings || new ctx.db.Channel().settings

  channel.updatedAt = new Date()
  if (newChannel) await channel.save()
  ctx.session.channelInfo = channel

  return true
}
