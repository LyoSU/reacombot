const { Schema } = require('mongoose')

const schema = Schema({
  channelId: {
    type: Number,
    index: true,
    unique: true,
    required: true
  },
  groupId: {
    type: Number,
    index: true
  },
  title: String,
  settings: {
    emojis: {
      type: String,
      default: '👍👎'
    },
    type: {
      type: String,
      enum: ['always', 'one', 'never'],
      default: 'always'
    },
    showStart: {
      type: String,
      enum: ['top', 'bottom'],
      default: 'bottom'
    },
    keyboard: Array
  },
  administrators: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: String
  }]
}, {
  timestamps: true
})

module.exports = schema
