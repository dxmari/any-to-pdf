const http = require('http');
const path = require('path');
require('dotenv').config();

const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const { json, urlencoded, raw, text } = require('body-parser');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const userModel = require('./src/models/users');
const DB_CONFIG = require('./src/config/db');

const { getRandomString, imageToHTML, txtToHTML } = require('./utils');
const { google, facebook } = require('./utils/social');
const app = express();

app.use(fileupload());
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(raw({ type: 'text/html' }));

app.set('view engine', 'ejs');

const deletesAt = 1000 * 60 * 5;
const SUPPORTED_EXTENTIONS = ['txt', 'html'];
const SUPPORTED_IMAGE_EXTENTIONS = ['jpg', 'jpeg', 'bmp', 'png', 'svg', 'gif'];

DB_CONFIG.connect();

const toPDF = (file, ext) => {
  return new Promise(async (resolve, reject) => {
    try {
      const source = path.resolve(__dirname, `file.${ext}`);
      const destination = path.resolve(__dirname, `file.pdf`);
      fs.writeFileSync(source, file.content);
      console.log('Create a Source File');
      await execCMD(`html-pdf ${source} ${destination}`);
      console.log('PDF Generated');
      fs.unlinkSync(source);
      console.log('Remove a Source File');
      resolve(fs.readFileSync(destination));
    } catch (error) {
      reject(error)
    }
  })
}

const uploading = (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ext = file.name.split('.')[file.name.split('.').length - 1];
      const fileName = getRandomString(10) + '-' + Date.now().toString() + '.' + ext;
      const filePath = path.resolve(__dirname, 'uploads/', fileName);
      fs.writeFileSync(filePath, file.data);
      resolve({
        deletesAt,
        fileName
      })
    } catch (error) {
      reject(error);
    }
  })
}

const converting = (fileName) => {
  return new Promise(async (resolve, reject) => {
    try {
      let source = path.resolve(__dirname, 'uploads/', fileName);
      const ext = fileName.split('.').pop();
      const destination = path.resolve(__dirname, 'outputs/', fileName.replace('.' + ext, '.pdf'));
      if (ext === 'html') {
      } else if (SUPPORTED_IMAGE_EXTENTIONS.indexOf(ext.toLowerCase()) >= 0) {
        source = await imageToHTML(source, path.resolve(__dirname, 'uploads/', fileName.replace('.' + ext, '.html')))
      } else if (ext === 'txt') {
        source = await txtToHTML(source, path.resolve(__dirname, 'uploads/', fileName.replace('.' + ext, '.html')))
      }

      console.log('Create a Source File');
      await execCMD(`html-pdf ${source} ${destination}`);
      console.log('PDF Generated');
      const size = (((fs.statSync(destination).size) / 1000).toFixed(1)).toString() + ' KB';

      setTimeout(() => {
        let orginalFile = source.replace('html', ext);
        fs.unlink(orginalFile, () => { });
        fs.unlink(source, () => { });
        fs.unlink(destination, () => { });
      }, deletesAt);
      resolve({ size, pdfBuffer: fs.readFileSync(destination) });
    } catch (error) {
      reject(error);
    }
  })
}

const execCMD = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err && err.code !== 0) {
        reject(stderr);
      } else {
        resolve(stdout || stderr);
      }
    })
  })
}

const findExt = (ext = 'html') => {
  return `.${SUPPORTED_EXTENTIONS.find(e => e === ext) || 'html'}`;
}

app.use(cookieParser());
app.use(session({
  key: 'user_sid',
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 60 * 1000 * 60 * 24 // one day
  }
}));

/* 
This middleware will check if user's cookie is still saved in browser and user is not set, 
then automatically log the user out.
This usually happens when you stop your express server after login, 
your cookie still remains saved in the browser. 
**/

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }
  next();
});


app.get('/', (req, res) => {
  let user = null;
  if (req.cookies.user_sid && req.session.user) user = req.session.user;
  res.render(path.resolve(__dirname, 'views/index'), { user })
});

app.get('/pdf-preview/:id', (req, res) => {
  try {
    fs.readFileSync(path.resolve(__dirname, 'outputs/', req.params.id + '.pdf'));
    let user = null;
    if (req.cookies.user_sid && req.session.user) user = req.session.user;
    res.render(path.resolve(__dirname, 'views/preview'), { user })
  } catch (error) {
    res.redirect('/');
  }
});



// End Points

app.post('/convert/to-pdf', async (req, res) => {
  const errorMsg = {};

  if (!req.query.name) {
    errorMsg.name = "File name is required"
  }
  if (Object.keys(req.body).length === 0) {
    errorMsg.content = "Raw Content is required"
  }
  if (Object.keys(errorMsg).length > 0) return res.status(400).json(errorMsg);

  const file = {
    name: req.query.name,
    content: req.body
  }
  toPDF(file, findExt(req.query.type)).then((pdfBuffer) => {
    if (!req.query.download) {
      res.json({ pdf: pdfBuffer });
      fs.unlinkSync(path.resolve(__dirname, 'file.pdf'));
    } else {
      res.download(path.resolve(__dirname, 'file' + '.pdf'));
    }
  }).catch(error => {
    console.log(error)
    res.status(400).json({
      error: error
    })
  })
})

app.post('/api/convert/to-pdf', async (req, res) => {
  try {
    const apiKey = (req.headers.authorization || '').split(' ').pop();
    let user = await userModel.findOne({
      api_key: apiKey
    });
    if (!user) {
      return res.status(401).json({
        errors: {
          messsage: 'Invalid authorization api key'
        }
      })
    }
    if (req.files.__file_from) {
      const { fileName } = await uploading(req.files.__file_from);
      const { size, pdfBuffer } = await converting(fileName);
      res.json({ size, pdfBuffer, deletesAt });
    } else {
      res.status(400).json({
        errors: {
          messsage: 'Please upload a file.'
        }
      })
    }
  } catch (error) {
    console.log(error);
    res.json({
      errors: {
        messsage: 'Something went wrong. Please try again..!'
      }
    })
  }
})

app.post('/file/uploading', async (req, res) => {
  try {
    if (req.files.__file_from) {
      const { fileName } = await uploading(req.files.__file_from);
      res.json({
        fileName,
        deletesAt
      })
    }
  } catch (error) {
    res.status(400).json({
      errors: {
        messsage: 'Please upload a file.'
      }
    })
  }
})

app.get('/file/convert/to-pdf/:id', async (req, res) => {
  try {
    const fileName = req.params.id;
    const { size } = await converting(fileName,);
    res.json({
      fileName,
      size
    })
  } catch (error) {
    res.json({
      errors: {
        messsage: 'No file found with name you given'
      }
    })
  }
})

app.get('/file/download/:id', async (req, res) => {
  const fileName = req.params.id + '.pdf';
  res.download(path.resolve(__dirname, 'outputs/', fileName), (err) => {
    if (err) {
      res.status(400).json({
        messsage: 'No file found'
      });
    }
  });
})

app.get('/reset/api_key/:id', async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user) return res.status(400).json({
    errors: {
      messsage: 'User not found.'
    }
  })
  user.api_key = getRandomString(10);
  await user.save();
  req.session.user = user;
  res.json({
    api_key: user.api_key
  })
})

app.post('/auth/google/login', async (req, res) => {
  try {
    const payload = await google(req.body.id_token);
    const userObj = {
      email: payload.email,
      full_name: payload.name || payload.email.split('@')[0],
      profile_pic: payload.picture || null,
      enrolled_type: 'google',
      last_enrolled_type: 'google',
      api_key: getRandomString(10)
    }
    const user = await userModel.findOne({
      email: userObj.email
    });

    if (!user) {
      const userDet = await userModel.create(userObj);
      req.session.user = userDet.toJSON();
      res.json(userDet);
    } else {
      user.full_name = userObj.full_name;
      user.profile_pic = userObj.profile_pic
      user.last_enrolled_type = 'google';
      req.session.user = user.toJSON();
      res.json(user);
    }
  } catch (error) {
    console.log('error', error);
    res.status(400).json({
      errors: {
        messsage: 'User not found.'
      }
    })
  }
})

app.post('/auth/facebook/login', async (req, res) => {
  try {
    const payload = await facebook(req.body.id_token);
    const userObj = {
      email: payload.email,
      full_name: ((payload.first_name + ' ' + (payload.last_name || '') || payload.email.split('@')[0])).trim(),
      profile_pic: payload.picture ? payload.picture.data.url : null,
      enrolled_type: 'facebook',
      last_enrolled_type: 'facebook',
      api_key: getRandomString(10)
    }
    const user = await userModel.findOne({
      email: userObj.email
    });

    if (!user) {
      const userDet = await userModel.create(userObj);
      req.session.user = userDet.toJSON();
      res.json(userDet);
    } else {
      user.full_name = userObj.full_name;
      user.profile_pic = userObj.profile_pic;
      user.last_enrolled_type = 'facebook';
      req.session.user = user.toJSON();
      res.json(user);
    }
  } catch (error) {
    res.status(400).json({
      errors: {
        messsage: 'User not found.'
      }
    })
  }
})

app.get('/auth/logout', (req, res) => {
  res.clearCookie('user_sid');
  delete req.session.user;
  res.send();
})

app.get('/views/*', async (req, res) => {
  res.sendFile(path.resolve(__dirname, req.path.replace('/', '')), (err) => {
    if (err) {
      res.status(400).json({
        messsage: 'No file found'
      });
    }
  });
})

app.get('*', async (req, res) => {
  res.sendFile(path.resolve(__dirname, req.path.replace('/', '')), (err) => {
    if (!err) {
      // fs.unlinkSync(path.resolve(__dirname, req.path.replace('/', '')));
    } else {
      res.status(400).json({
        messsage: 'No file found'
      });
    }
  });
})

const server = http.createServer(app);
server.listen(9030, () => {
  console.log('9030 is the magic port');
})