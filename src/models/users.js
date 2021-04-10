const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  profile_pic: {
    type: String,
    default: null
  },
  mobile_no: {
    type: String,
    default: null
  },
  enrolled_type: {
    type: String,
    enum: ['facebook', 'google'],
    default: null
  },
  last_enrolled_type: {
    type: String,
    enum: ['facebook', 'google'],
    default: null
  },
  api_key: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})


module.exports = mongoose.model('users', userSchema);