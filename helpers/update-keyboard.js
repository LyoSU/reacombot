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

function raceAll (promises, timeout) {
  return Promise.all(promises.map(p => {
    return Promise.race([p, sleep(timeout)])
  }))
}

const keyboardUpdate = async (channelId, channelMessageId, message) => {
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
        url: `https://t.me/c/${channel.groupId.toString().substr(4)}/${channel.settings.showStart === 'top' ? 2 : post.groupMessageId + 1000000}?thread=${post.groupMessageId}`
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

  let methodUpdate = 'editMessageReplyMarkup'
  const optsUpdate = {
    chat_id: channelId,
    message_id: channelMessageId,
    reply_markup: JSON.stringify({ inline_keyboard: [votesKeyboardArray].concat(post.keyboard) })
  }

  if (message && message.type) {
    if (message.type === 'text') {
      methodUpdate = 'editMessageText'
      optsUpdate.text = message.text
    }
    if (message.type === 'media') {
      methodUpdate = 'editMessageCaption'
      optsUpdate.caption = message.text
    }
  }

  if (!post.keyboardNextUpdate || new Date().getTime() > post.keyboardNextUpdate.getTime()) {
    return Promise.race([
      telegram.callApi(methodUpdate, optsUpdate).then(() => {
        db.Post.findByIdAndUpdate(post, {
          keyboardNextUpdate: new Date(new Date().getTime() + 200)
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
      sleep(350).then(() => {
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
  const promises = []
  for (const post of findPost) {
    promises.push(keyboardUpdate(post.channel.channelId, post.channelMessageId))
  }
  if (promises.length > 0) {
    const result = await raceAll(promises, 5 * 1000).catch(error => {
      console.error('update post error:', error)
    })
    console.log('result keyboard update:', result)
  }
  setTimeout(checkPsotForUpdate, 1000)
}
setTimeout(checkPsotForUpdate, 1000)

module.exports = keyboardUpdate
