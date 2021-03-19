const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const { json, urlencoded, raw, text} = require('body-parser');

const app = express();

app.use(json());
app.use(urlencoded({ extended: false }));
app.use(raw({type : 'text/html'}));

const SUPPORTED_EXTENTIONS = ['txt', 'html'];

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
      res.json({ pdf : pdfBuffer });
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


app.get('*', async (req, res) => {
  res.sendFile(path.resolve(__dirname, req.path.replace('/', '')), (err) =>{
    if(!err){
      fs.unlinkSync(path.resolve(__dirname, req.path.replace('/', '')));
    }else{
      res.status(400).json({
        messsage : 'No file found'
      });
    }
  });
})

const server = http.createServer(app);
server.listen(9030, () => {
  console.log('9030 is the magic port');
})