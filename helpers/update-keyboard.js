const {
  db
} = require('../database')
const Telegram = require('telegraf/telegram')

const telegram = new Telegram(process.env.BOT_TOKEN)

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const keyboardUpdate = async (channelId, channelMessageId) => {
  const channel = await db.Channel.findOne({ channelId })
  const post = await db.Post.findOne({ channel, channelMessageId })

  const votesKeyboardArray = []

  post.rate.votes.forEach(react => {
    votesKeyboardArray.push({
      text: `${react.name} ${react.vote.length > 0 ? react.vote.length : ''}`,
      callback_data: `rate:${react.name}`
    })
  })

  if (post.commentsEnable === true) {
    if (post.groupMessageId) {
      votesKeyboardArray.push({
        text: `💬 ${post.commentsCount > 0 ? post.commentsCount : ''}`,
        url: `https://t.me/c/${channel.groupId.toString().substr(4)}/${channel.settings.showStart === 'top' ? 1 : 1000000}?thread=${post.groupMessageId}`
      })
    } else {
      if (new Date().getTime() > new Date(post.createdAt.getTime() + (1000 * 30)).getTime()) {
        post.commentsEnable = false
      } else {
        votesKeyboardArray.push({
          text: '💬 🕒',
          callback_data: 'post:wait'
        })
      }
    }
  }

  if (!post.keyboardNextUpdate || new Date().getTime() > post.keyboardNextUpdate.getTime()) {
    return Promise.race([
      telegram.editMessageReplyMarkup(channelId, channelMessageId, null, {
        inline_keyboard: [votesKeyboardArray].concat(post.keyboard)
      }).then(() => {
        db.Post.findByIdAndUpdate(post, {
          keyboardNextUpdate: new Date(new Date().getTime() + 150)
        }).then(() => {})
        return { edited: true }
      }).catch(error => {
        if (error.parameters && error.parameters.retry_after) {
          db.Post.findByIdAndUpdate(post, {
            keyboardNextUpdate: new Date(new Date().getTime() + (1000 * error.parameters.retry_after))
          }).then(() => {})
        }
        if (error.code === 400) {
          db.Post.findByIdAndUpdate(post, {
            keyboardNextUpdate: null
          }).then(() => {})
        }
        return { edited: false, error }
      }),
      sleep(1500).then(() => {
        return { edited: false, error: 'timeout' }
      })
    ])
  } else {
    return { edited: false, error: 'wait' }
  }
}

async function checkPsotForUpdate () {
  const findPost = await db.Post.find({
    keyboardNextUpdate: {
      $lt: new Date()
    }
  }).populate('channel')
  for (const post of findPost) {
    await keyboardUpdate(post.channel.channelId, post.channelMessageId)
  }
  setTimeout(checkPsotForUpdate, 1000 * 1)
}
setTimeout(checkPsotForUpdate, 1000 * 1)

module.exports = keyboardUpdate
