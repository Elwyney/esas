const { BASE_URL } = require("./config");
let COOKIES = "";

async function setCookies(cookies) {
    COOKIES = cookies + ' login=nadyrgulov;';
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
    try { return JSON.parse(text); } catch (e) { throw new Error(`Невалидный JSON: ${text.slice(0, 200)}`); }
}
module.exports = { post, setCookies }

