import {WeChat} from '../src';

let weChat = new WeChat();

weChat.on('ready', function () {
    weChat.sendMessage({
        text: '测试测试测试',
        to: 'filehelper'
    });
});

weChat.on('message', function (message) {
    console.log(message);
});

weChat.start();
