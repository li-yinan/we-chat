import {WeChat} from '../src';

(async function () {
    let weChat = new WeChat();
    await weChat.login();
    await weChat.init();
})();
