const { Schema } = require('mongoose')

const schema = Schema({
  channel: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    index: true
  },
  channelMessageId: {
    type: Number,
    required: true
  },
  groupMessageId: {
    type: Number
  },
  rate: {
    votes: [{
      type: Object,
      name: String,
      vote: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    score: {
      type: Number,
      index: true
    }
  },
  keyboard: Array,
  commentsEnable: {
    type: Boolean,
    default: true
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  keyboardNextUpdate: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
})

module.exports = schema
