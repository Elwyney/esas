import { BASE_URL, USERNAME } from './config.js';
let COOKIES = "";

async function setCookies(cookies) {
    if (!cookies) {
        throw new Error('Не получены cookies авторизации');
    }
    COOKIES = cookies + ` login=${USERNAME};`;
}

async function post(url, body) {
    const HEADERS = {
        "accept": "*/*",
        "accept-language": "ru,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "priority": "u=1, i",
        "x-requested-with": "XMLHttpRequest",
        "cookie": COOKIES,
        "Referer": `${BASE_URL}/?c=promed`,
        "Referrer-Policy": "strict-origin-when-cross-origin"
    };
    const res = await fetch(`${BASE_URL}/${url}`, {
        method: 'POST',
        headers: HEADERS,
        body
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Невалидный JSON: ${text.slice(0, 200)}`);
    }
}

export { post, setCookies };

