const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const { json, urlencoded, raw, text } = require('body-parser');
const fileupload = require('express-fileupload');

const { getRandomString, imageToHTML, txtToHTML } = require('./utils');
const app = express();

app.use(fileupload());
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(raw({ type: 'text/html' }));

const SUPPORTED_EXTENTIONS = ['txt', 'html'];
const SUPPORTED_IMAGE_EXTENTIONS = ['jpg', 'jpeg', 'bmp', 'png', 'svg', 'gif'];

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

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views/index.html'))
});

app.get('/pdf-preview/:id', (req, res) => {
  try {
    fs.readFileSync(path.resolve(__dirname, 'outputs/', req.params.id + '.pdf'));
    res.sendFile(path.resolve(__dirname, 'views/preview.html'))
  } catch (error) {
    res.redirect('/');
  }
});

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

app.post('/file/uploading', async (req, res) => {
  try {
    if (req.files.__file_from) {
      const deletesAt = 1000 * 60 * 5;
      const ext = req.files.__file_from.name.split('.')[req.files.__file_from.name.split('.').length - 1];
      const fileName = getRandomString(10) + '-' + Date.now().toString() + '.' + ext;
      const filePath = path.resolve(__dirname, 'uploads/', fileName);
      fs.writeFileSync(filePath, req.files.__file_from.data);
      // setTimeout(() =>{
      //   fs.unlink(filePath);
      // }, 1000 * 60 * 5);
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
    let source = path.resolve(__dirname, 'uploads/', fileName);
    const ext = fileName.split('.').pop();
    const destination = path.resolve(__dirname, 'outputs/', fileName.replace('.' + ext, '.pdf'));
    if (ext === 'html') {
    } else if (SUPPORTED_IMAGE_EXTENTIONS.indexOf(ext.toLowerCase()) >= 0) {
      source = await imageToHTML(source, path.resolve(__dirname, 'uploads/', fileName.replace('.' + ext, '.html')))
    }else if (ext === 'txt') {
      source = await txtToHTML(source, path.resolve(__dirname, 'uploads/', fileName.replace('.' + ext, '.html')))
    }

    console.log('Create a Source File');
    await execCMD(`html-pdf ${source} ${destination}`);
    console.log('PDF Generated');
    const size = (((fs.statSync(destination).size) / 1000).toFixed(1)).toString() + ' KB';
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