import {WeChat} from '../src';

let weChat = new WeChat();

weChat.on('ready', function () {
    let info = weChat.getContact('清幽月光');
    // setInterval(function () {
    //     weChat.sendMessage({
    //         text: (new Date()).toLocaleString(),
    //         to: 'filehelper'
    //     });
    // }, 10 * 60 * 1000);
    weChat.sendMessage({
        text: (new Date()).toLocaleString(),
        to: info.UserName
    });
});

weChat.on('message', function (message) {
    console.log(message);
});

weChat.start();
