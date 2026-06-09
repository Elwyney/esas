import { BASE_URL } from './config.js';

async function auth(username, password) {
  const response = await fetch(`${BASE_URL}/?c=main&m=index&method=Logon&login=${username}`, {
    method: "POST",
    headers: {
      "accept": "*/*",
      "accept-language": "ru,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"YaBrowser\";v=\"25.2\", \"Yowser\";v=\"2.5\", \"YaBrowserCorp\";v=\"132.0\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
    },
    body: `login=${username}&psw=${password}&swUserRegion=&swUserDBType=`
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ошибка авторизации HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Сервер не вернул set-cookie после авторизации');
  }

  return setCookie;
}

export { auth };
