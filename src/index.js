/**
 * 微信登录，https://github.com/maiff/Itchat/blob/master/doc/%E6%95%99%E7%A8%8B.md
 *
 * @author li-yinan
 * @version 1.0
 * @date 2018-06-20
 */

import {
    post,
    postJson,
    get,
    qrcode,
    xml2json,
    setData,
    getData,
    clearData,
    readData,
    getSyncKey,
    exe
} from './util';

import EventEmitter from 'events';

const deviceid = 'e980803117785423';
const LOGIN_URL = 'https://login.weixin.qq.com/jslogin';
const REDIRECT_URL = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage';
const LOGIN_BASE_URL = 'https://login.weixin.qq.com/l/';
// const QRCODE_URL = 'https://login.weixin.qq.com/qrcode/';
const IS_LOGIN_URL = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login';

export class WeChat extends EventEmitter {
    async login() {
        // 获取uuid
        let res = await post(LOGIN_URL, {
            appid: 'wx782c26e4c19acffb',
            fun: 'new',
            redirect_uri: REDIRECT_URL,
            lang: 'zh_CN',
            _: Date.now()
        });
        let {QRLogin} = exe(res);
        if (QRLogin.code !== 200) {
            throw 'get qrcode fail';
        }
        let uuid = QRLogin.uuid;
        // 在终端里展现qrcode
        console.log(await qrcode(LOGIN_BASE_URL + uuid));

        // 循环等待用户扫描登录二维码
        let loginResult = {};
        while(loginResult.code !== 200) {
            let tip = 1;
            // 用户未扫描
            if (loginResult.code === 408) {
                tip = 1;
            }
            // 用户已扫描，未点击登录
            else if (loginResult.code === 201) {
                tip = 0;
            }
            // 获取结果
            loginResult = exe(await get(IS_LOGIN_URL, {
                tip,
                uuid,
                _: Date.now(),
                loginicon: false
            }));
        }
        // 获取skey、wxsid、wxuin、pass_ticket
        res = xml2json(await get(loginResult.redirect_uri + '&fun=new&version=v2'));
        // 把获取到的各种id存到公共地方
        res = setData(res.error);
        let baseUrl = loginResult.redirect_uri.match(/(wx.+com)/)[1];
        setData({baseUrl});
    }

    async init() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
        } = getData();
        let url = `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?lang=zh_CN&pass_ticket=${pass_ticket}&skey=${skey}&r=${~Date.now()}`;
        let res = await post(url, JSON.stringify({
            BaseRequest: {
                Uin: wxuin,
                Sid: wxsid,
                Skey: skey,
                DeviceID: deviceid
            }
        }));
        return setData(JSON.parse(res));
    }

    async syncCheck() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
            baseUrl
        } = getData();
        let synckey = getSyncKey();
        let url = `https://webpush.${baseUrl}/cgi-bin/mmwebwx-bin/synccheck`;
        let res = await get(url, {
            r: Date.now(),
            sid: wxsid,
            uin: wxuin,
            skey,
            deviceid,
            _: Date.now(),
            synckey
        });
        let {synccheck} = exe(res);
        if (synccheck.retcode - 0) {
            console.log(synccheck.retcode);
            await clearData();
            throw 'logout';
            // this.start();
        }
        if (synccheck.selector - 0) {
            // new message
            console.log('new message');
        }
        await this.webWxSync();
    }

    async webWxStatusNotify() {
        let data = getData();
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
            User,
            baseUrl,
            SyncKey
        } = getData();
        let userName = User.UserName;
        let url = `https://${baseUrl}/cgi-bin/mmwebwx-bin/webwxstatusnotify?lang=zh_CN&pass_ticket=${pass_ticket}`;
        let res = await post(url, JSON.stringify({
            BaseRequest: {
                Uin: wxuin,
                Sid: wxsid,
                Skey: skey,
                DeviceID: deviceid
            },
            Code: 3,
            FromUserName: userName,
            ToUserName: userName,
            ClientMsgId: ~Date.now()
        }));
        return setData(JSON.parse(res));
    }

    async webWxSync() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
            baseUrl,
            SyncKey
        } = getData();
        let url = `https://${baseUrl}/cgi-bin/mmwebwx-bin/webwxsync?pass_ticket=${pass_ticket}&skey=${skey}&sid=${wxsid}`;
        let res = await post(url, JSON.stringify({
            BaseRequest: {
                Uin: wxuin,
                Sid: wxsid,
                Skey: skey,
                DeviceID: deviceid
            },
            SyncKey,
            rr: ~Date.now()
        }));
        let data = JSON.parse(res);
        if (data.AddMsgCount) {
            data.AddMsgList.map(item => this.handleMessage(item));
        }
        setData(data);
    }

    handleMessage(message) {
        if (message.MsgType === 1) {
            // 文字消息
            this.emit('message', message);
        }
    }

    async getContactList() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            User,
            skey,
            baseUrl,
            SyncKey
        } = getData();
        let url = `https://${baseUrl}/cgi-bin/mmwebwx-bin/webwxgetcontact?pass_ticket=${pass_ticket}&skey=${skey}&seq=0&r=${Date.now()}`;
        let res = await get(url);
        res = setData(JSON.parse(res));
        return res.MemberList;
    }

    getContact(name) {
        let {
            MemberList
        } = getData();
        return MemberList.find(item => {
            if (
                item.NickName === name
                || item.RemarkName === name
            ) {
                return true;
            }
        });
    }

    async sendMessage({to, text}) {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            User,
            skey,
            baseUrl,
            SyncKey
        } = getData();
        let userName = User.UserName;
        // 没填就发给文件助手
        to = to || 'filehelper';
        let LocalID = (Date.now() % 10000) * 10000 + parseInt(Math.random() * 10000, 10);
        let url = `https://${baseUrl}/cgi-bin/mmwebwx-bin/webwxsendmsg?pass_ticket=${pass_ticket}`;
        let res = await post(url, JSON.stringify({
            BaseRequest: {
                Uin: wxuin,
                Sid: wxsid,
                Skey: skey,
                DeviceID: deviceid
            },
            Msg: {
                Type: 1, // 文字
                Content: text,
                FromUserName: userName,
                ToUserName: to,
                LocalID,
                ClientMsgId: LocalID
            }
        }));
    }

    async start() {
        await readData();
        let res = await this.webWxStatusNotify();
        let needLogin = res.BaseResponse.Ret !== 0;
        if (needLogin) {
            await this.login();
            console.log('login ok');
            await this.init();
            console.log('init ok');
            await this.getContactList();
            console.log('get contact list ok');
        }
        else {
            await this.init();
            console.log('init ok');
        }
        await this.webWxStatusNotify();
        console.log('ready');
        this.emit('ready');
        while(true) {
            console.log('syncing');
            await this.syncCheck();
        }
    }
}
