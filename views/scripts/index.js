$(async function () {
  initiateSocialLogin();
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
    window.location.href = 'pdf-preview/' + converter.fileName.replace("." + ext, '');
  })
  const slideOutPanel = $('#slide-out-panel').SlideOutPanel({
    width: '600px'
  });
  $(window).on('scroll', function () {
    if ($(this).scrollTop() >= 40) {
      if (!$('nav').hasClass('box-shadow')) $('nav').addClass('box-shadow')
    } else {
      $('nav').removeClass('box-shadow')
    }
  })
  window.slideOutPanel = slideOutPanel;
  $('select').niceSelect();
  setTimeout(() => {
    initTabs();
  })
})

function closeDrawer() {
  slideOutPanel.close();
}

const sleep = (timeout = 800) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  })
}

function login() {
  $('.users-sec .user-det .chips span').text('Signin')
  slideOutPanel.open();
}

function register() {
  $('.users-sec .user-det .chips span').text('Signup')
  slideOutPanel.open();
}

function initiateSocialLogin() {
  setTimeout(() => {
    gapi.load('auth2', function () {
      auth2 = gapi.auth2.init();
    });
  }, 800);
}

function googleSignIn() {
  auth2.signIn().then(async result => {
    slideOutPanel.close();
    const id_token = result.getAuthResponse().id_token;
    console.log('id_token', id_token)
    let resp = await $.ajax('/auth/google/login', {
      type: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify({
        id_token
      })
    })
    console.log(resp);
    window.location.reload();
  }).catch(err => {
    console.log(err)
  })
}

function facebookSignIn() {
  FB.login(function (response) {
    if (response.status === 'connected') {
      // Logged into your webpage and Facebook.
      slideOutPanel.close();
      (async function () {
        const { authResponse } = response;
        window.fbToken = authResponse.accessToken;
        let resp = await $.ajax('/auth/facebook/login', {
          type: 'POST',
          headers: {
            "Content-Type": "application/json"
          },
          data: JSON.stringify({
            id_token: authResponse.accessToken
          })
        })
        console.log(resp);
        window.location.reload();
      })();
    } else {
      // The person is not logged into your webpage or we are unable to tell. 
    }
  });
}

async function logout(login_type){
  if(login_type === 'google'){
    auth2.signOut();
  }else{
    FB.logout();
  }
  await $.get('/auth/logout');
  location.reload();
}

async function copyResetCode(user_id, api_key, event) {
  if ($(event.target).text() === 'Reset') {
    console.log('reset');
    try {
      let resp = await $.get('/reset/api_key/' + user_id);
      console.log(resp);
      $('.api_key_cpy').text(resp.api_key);
    } catch (error) {
      console.log(error);
    }
  } else {
    $('.api_key_cpy').text(api_key);
    $('.api_key_cpy').css('cursor', 'text');
    copyToClipBoard($('.api_key_cpy'));
    $(event.target).addClass('reset_span')
    $(event.target).html('<span class="reset_key">Reset</span>');
  }
}

function copyToClipBoard(element) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val($(element).text()).select();
  document.execCommand("copy");
  $temp.remove();
}

function initTabs() {
  const tabsList = document.querySelectorAll(".tabs");

  function calculateLeft(element) {
    return element
      ? element.offsetWidth + calculateLeft(element.previousElementSibling)
      : 16;
  }

  tabsList.forEach((tabs) => {
    const indicator = tabs.querySelector(".indicator");
    tabs.addEventListener("click", function (e) {
      if (e.target.nodeName === "A") {
        e.preventDefault();
        for (let i = 0; i < tabs.children.length; i++) {
          tabs.children[i].classList.remove("active");
        }
        e.target.parentNode.classList.add("active");
        indicator.style.left = `${calculateLeft(
          e.target.parentNode.previousElementSibling
        )}px`;
        indicator.style.width = `${e.target.offsetWidth}px`;
        const tabId = $(e.target).attr('tab-id');
        $(`div[tab-key]`).hide();
        $(`div[tab-key=${tabId}]`).fadeIn(500);
      }
    });
  });
  $(`div[tab-key]`).eq(0).show();
}