require('dotenv').config({ path: './.env' })
const {
  db
} = require('.')
const {
  getChannel
} = require('../helpers')

const updateChannels = () => {
  const channels = db.Channel.find().cursor()

  channels.on('data', async (channel) => {
    const ch = await getChannel({ id: channel.channelId })
    await ch.save()
    console.log(ch.title)
  })
}

updateChannels()
