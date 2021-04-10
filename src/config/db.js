const mongoose = require('mongoose');
const { MONGO_DB_URL } = process.env;

const connect = () => {
  mongoose.connect(MONGO_DB_URL, {
    useNewUrlParser : true,
    useUnifiedTopology : true 
  }).then(() => {
    console.log('DB initialized successfully');
  }).catch(err => {
    console.log(err);
  });
}

module.exports = {
  connect
}