const Telegram = require('telegraf/telegram')
const {
  db
} = require('../database')

const telegram = new Telegram(process.env.BOT_TOKEN)

module.exports = async chat => {
  let newChannel = false
  let channel = await db.Channel.findOne({ channelId: chat.id })

  if (!channel) {
    newChannel = true
    channel = new db.Channel()
    channel.channelId = chat.id
  }

  if (chat.title) channel.title = chat.title
  if (chat.username) channel.username = chat.username
  channel.settings = channel.settings || new db.Channel().settings

  const chatAdministrators = await telegram.getChatAdministrators(chat.id).catch(console.error)
  if (!chatAdministrators) {
    channel.available = false
  } else {
    channel.administrators = []

    for (const admin of chatAdministrators) {
      channel.administrators.push({
        user: admin.user.id,
        status: admin.status
      })
    }
  }

  channel.updatedAt = new Date()
  if (newChannel) await channel.save()

  return channel
}
