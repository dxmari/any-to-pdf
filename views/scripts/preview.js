$(function () {
  $('.preview-sec').height(window.innerHeight - 60)
  $('.side-sec').height(window.innerHeight - 60)
  NProgress.configure({ parent: '.preview-sec', showSpinner: false })
  NProgress.start();
  NProgress.set(0.5);
  const fileName = window.location.href.split('/').pop();
  const size = sessionStorage.getItem(fileName);
  $('.file-name h2').text('file_' + fileName);
  $('.file-size').text(size);
  $('#pdf-viewer').height(window.innerHeight - 120);
  $('#pdf-viewer').attr('src', `/outputs/${fileName}.pdf#toolbar=0`);
  NProgress.done(true);
})

function downloadFile() {
  const fileName = window.location.href.split('/').pop();
  window.open('/file/download/' + fileName, '_self')
}