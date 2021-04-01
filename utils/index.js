const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

exports.getRandomString = (length = 40) => {
  return crypto.randomBytes(length).toString('hex');
}

exports.imageToHTML = (source, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      const ext = fileName.split('.').pop();
      const file = fs.readFileSync(source);
      const base64 = `data:image/${ext};base64,${file.toString('base64')}`
      const html = `<!DOCTYPE html>
      <html lang="en">
      <body>
        <img style="width: 100%;object-fit: contain;" src="${base64}" alt="">
      </body>
      </html>`
      fs.writeFileSync(fileName, html, { encoding: 'utf-8' });
      resolve(fileName);
    } catch (error) {
      reject(error);
    }
  })
}

exports.txtToHTML = (source, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      const file = fs.readFileSync(source, { encoding: 'utf-8' });
      const html = `<!DOCTYPE html>
      <html lang="en">
      <body>
        ${file.toString().replace(/(?:\ r\n|\r|\n)/g, '<br>')}
      </body>
      </html>`
      fs.writeFileSync(fileName, html, { encoding: 'utf-8' });
      resolve(fileName);
    } catch (error) {
      reject(error);
    }
  })
}