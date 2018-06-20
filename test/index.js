import {WeChat} from '../src';

(async function () {
    let weChat = new WeChat();
    await weChat.start();
    // await weChat.init();
})();
