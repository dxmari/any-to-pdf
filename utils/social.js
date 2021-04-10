const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const { GOOGLE_CLIENT_ID } = process.env;

exports.google = (token) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      resolve(payload);
    } catch (error) {
      console.log('google_error', error);
      reject(error);
    }
  })
}

exports.facebook = (accesstoken) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios({
        url: 'https://graph.facebook.com/me',
        method: 'get',
        params: {
          fields: ['id', 'email', 'first_name', 'last_name', 'picture'].join(','),
          access_token: accesstoken,
        },
      });
      resolve(data);
    } catch (error) {
      reject(error);
    }
  })
}