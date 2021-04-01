$(function () {
  $('#dropper').on('change', async (e) => {
    console.log(e.target.files);
    $('.file-dropper').addClass('uploading');
    NProgress.configure({ parent: '.top-loader-bar', showSpinner: false })
    NProgress.start();
    NProgress.set(0.5);
    const formData = new FormData();
    formData.append('__file_from', e.target.files[0]);
    let uploader = await $.ajax({
      url: '/file/uploading',
      type: 'post',
      data: formData,
      contentType: false,
      processData: false
    })

    await sleep();

    $('.file-dropper').removeClass('uploading');
    $('.file-dropper').addClass('converting');
    NProgress.done(true);

    let converter = await $.get('/file/convert/to-pdf/' + uploader.fileName);
    console.log(converter);
    $('.file-dropper').removeClass('converting');
    const ext = converter.fileName.split('.').pop();
    sessionStorage.setItem(converter.fileName.replace("." + ext, ''), converter.size);
    window.location.href = 'pdf-preview/' +  converter.fileName.replace("." + ext, '');
  })
})

const sleep = (timeout = 800) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  })
}