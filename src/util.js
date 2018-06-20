import requestpn from 'request-promise-native';
import qrcodeTerminal from 'qrcode-terminal';
import {URLSearchParams} from 'url';
import xmlToJson from 'xml2json';
// import vm from 'vm';

let globalVar = {
    QRLogin: {
    }
};

let request = requestpn.defaults({jar: true});

export async function post(url, params) {
    return await request
        .post(url)
        .form(params)
        .on('response', function (response) {
            let headers = response.headers;
            let setCookies = headers['set-cookie'] || [];
            setCookies.map(item => request.cookie(item));
        });
}

export async function get(url, params) {
    let paramStr = new URLSearchParams(params);
    return await request
        .get(url + '?' + paramStr)
        .on('response', function (response) {
            let headers = response.headers;
            let setCookies = headers['set-cookie'] || [];
            setCookies.map(item => request.cookie(item));
        });
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

export function setData(data) {
    globalVar = Object.assign({}, globalVar, data);
    return globalVar;
}

export function getData() {
    return globalVar;
}
