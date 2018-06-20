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
    getSyncKey,
    exe
} from './util';

const deviceid = 'e980803117785423';
const LOGIN_URL = 'https://login.weixin.qq.com/jslogin';
const REDIRECT_URL = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage';
const LOGIN_BASE_URL = 'https://login.weixin.qq.com/l/';
// const QRCODE_URL = 'https://login.weixin.qq.com/qrcode/';
const IS_LOGIN_URL = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login';

export class WeChat {
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
            let tip;
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
    }

    async init() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
        } = getData();
        let url = `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?pass_ticket=${pass_ticket}&skey=${skey}&r=${~Date.now()}`;
        let res = await post(url, JSON.stringify({
            BaseRequest: {
                Uin: wxuin,
                Sid: wxsid,
                Skey: skey,
                DeviceID: deviceid
            }
        }));
        setData(res);
    }

    async syncCheck() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
        } = getData();
        let synckey = getSyncKey();
        let url = 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck';
        let res = await get(url, {
            r: ~Date.now(),
            sid: wxsid,
            uin: wxuin,
            skey,
            deviceid,
            synckey
        });
        let {synccheck} = exe(res);
        if (synccheck.retcode - 0) {
            console.log(synccheck.retcode);
            throw 'logout';
        }
        if (synccheck.selector - 0) {
            // new message
            // 本应该继续用webWxSync拉取消息的
            // 但是我只需要发消息，这块就先不处理了
            // 反而是把消息拉取过来会导致手机端消息接收变慢
            console.log(synccheck.selector);
        }
        await this.webWxSync();
    }

    async webWxSync() {
        let {
            wxuin,
            wxsid,
            pass_ticket,
            skey,
            SyncKey
        } = getData();
        let url = `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?pass_ticket=${pass_ticket}&skey=${skey}&sid=${wxsid}`;
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
        setData(res);
    }

    async start() {
        await this.login();
        await this.init();
        while(true) {
            await this.syncCheck();
        }
    }
}
