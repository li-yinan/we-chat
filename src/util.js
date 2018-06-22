import requestpn from 'request-promise-native';
import qrcodeTerminal from 'qrcode-terminal';
import {URLSearchParams} from 'url';
import xmlToJson from 'xml2json';
import fs from 'fs';
import path from 'path';
// import vm from 'vm';

let globalVarTemplate = {
    QRLogin: {
    },
    synccheck: {
    },
    baseUrl: 'wx.qq.com',
    MemberList: [],
    setCookies: [],
    User: {
    },
    SyncKey: {
        Count: 0,
        List: []
    }
};

let globalVar = JSON.parse(JSON.stringify(globalVarTemplate));

let request = requestpn.defaults({jar: true});

let configFilePath = path.join(__dirname, '../config.json');
export async function post(url, params) {
    let setCookies = globalVar.setCookies || [];
    let j = request.jar();
    setCookies.map(item => {
        try {
            j.setCookie(request.cookie(item), url);
        }
        catch (e) {
        }
    });
    request = request.defaults({jar:j});
    let res = await request
        .post(url)
        .form(params)
        .on('response', function (response) {
            let headers = response.headers;
            let setCookies = headers['set-cookie'] || [];
            globalVar.setCookies = [...globalVar.setCookies, ...setCookies];
            // setCookies.map(item => request.cookie(item));
        });
    // console.log('post', url, params, res);
    return res;
}

export async function get(url, params) {
    let paramStr = new URLSearchParams(params);
    let setCookies = globalVar.setCookies || [];
    let j = request.jar();
    setCookies.map(item => {
        try {
            j.setCookie(request.cookie(item), url);
        }
        catch (e) {
        }
    });
    request = request.defaults({jar:j});
    let res = await request
        .get(url + '?' + paramStr)
        .on('response', function (response) {
            let headers = response.headers;
            let setCookies = headers['set-cookie'] || [];
            globalVar.setCookies = [...globalVar.setCookies, ...setCookies];
            // setCookies.map(item => request.cookie(item));
        });
    // console.log('get', url, params, res);
    return res;
}

export function exe(code) {
    let wrap = `
        (function (window) {
            ${code}
        })(globalVar);
        globalVar;
    `;
    return eval(wrap);
    // return vm.runInThisContext(code);
}

export async function qrcode(url) {
    return new Promise(resolve => qrcodeTerminal.generate(url, resolve));
}

export function xml2json(xml) {
    return JSON.parse(xmlToJson.toJson(xml));
}

export async function setData(data) {
    globalVar = Object.assign({}, globalVar, data);
    await writeData();
    return globalVar;
}

export function getData() {
    return globalVar;
}

export async function clearData() {
    globalVar = JSON.parse(JSON.stringify(globalVarTemplate));
    await writeData();
}

export function getSyncKey() {
    let list = globalVar.SyncKey.List;
    return list.map(item => item.Key + '_' + item.Val).join('|');
}

export async function writeData() {
    return new Promise((resolve, reject) => {
        fs.writeFile(configFilePath, JSON.stringify(globalVar), err => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

export async function readData() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(configFilePath)) {
            fs.readFile(configFilePath, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                try {
                    globalVar = Object.assign({}, globalVar, JSON.parse(data));
                }
                catch (e) {
                    clearData();
                }
                resolve(globalVar);
            });
        }
        else {
            resolve(globalVar);
        }
    });
}
