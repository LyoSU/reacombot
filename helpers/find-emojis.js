const createEmojiRegex = require('emoji-regex')

const emojiRegex = createEmojiRegex()

module.exports = (str) => {
  const emojis = str.matchAll(emojiRegex)
  const result = []
  for (const emoji of emojis) {
    result.push(emoji[0])
  }

  return result
}
