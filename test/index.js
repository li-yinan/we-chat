import {WeChat} from '../src';

(async function () {
    let weChat = new WeChat();
    weChat.on('ready', function () {
        let mmyg = weChat.getContact('明媚阳光');
        console.log(mmyg);
        // weChat.sendMessage({
        //     text: '测试测试测试',
        //     to: mmyg.UserName
        // });
    });
    await weChat.start();
})();
