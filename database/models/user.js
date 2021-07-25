const { Schema } = require('mongoose')

const userSchema = Schema({
  telegramId: {
    type: Number,
    index: true,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    index: true
  },
  lastName: {
    type: String,
    index: true
  },
  fullName: {
    type: String,
    index: true
  },
  username: {
    type: String
  },
  settings: {
    locale: String
  }
}, {
  timestamps: true
})

module.exports = userSchema
