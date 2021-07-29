const Composer = require('telegraf/composer')
const rateLimit = require('telegraf-ratelimit')
const {
  keyboardUpdate
} = require('../helpers')

const composer = new Composer()

composer.action(/^(rate):(.*)/, rateLimit({
  window: 1000,
  limit: 1
}), async ctx => {
  let resultText = ''
  const rateName = ctx.match[2]

  const { message } = ctx.callbackQuery

  const channel = await ctx.db.Channel.findOne({ channelId: message.chat.id })
  const post = await ctx.db.Post.findOne({ channel, channelMessageId: message.message_id })

  if (!post) return

  post.rate.votes.map(rate => {
    const indexRate = rate.vote.indexOf(ctx.from.id)

    if (indexRate > -1) rate.vote.splice(indexRate, 1)
    if (rateName === rate.name) {
      if (indexRate > -1) {
        resultText = ctx.i18n.t('rate.vote.back', { me: ctx.me })
      } else {
        resultText = ctx.i18n.t('rate.vote.rated', { rateName, me: ctx.me })
        rate.vote.push(ctx.from.id)
      }
    }
  })

  post.markModified('rate')

  if (post.rate.votes.length === 2) post.rate.score = post.rate.votes[0].vote.length - post.rate.votes[1].vote.length

  await post.save()

  const updateResult = await keyboardUpdate(channel.channelId, post.channelMessageId)

  if (updateResult.error && updateResult.error !== 'timeout') {
    const reactListArray = post.rate.votes.map(rate => {
      return `${rate.name} — ${rate.vote.length}`
    })

    ctx.state.answerCbQuery = [resultText + ctx.i18n.t('rate.vote.rated_limit', { rateName, reactList: reactListArray.join('\n') }), true]
  } else {
    ctx.state.answerCbQuery = [resultText]
  }
})

module.exports = composer
