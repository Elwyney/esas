## Требования

Для работы требуется **Linux**, **Node.js**, программа **КриптоПро** и действующий **сертификат**.
## Управление через PM2 (always-on)

**Команды:**
- `pm2 start cron.js --name esas` — Старт
- `pm2 stop esas` — Остановить
- `pm2 restart esas` — Перезапустить
- `pm2 delete esas` — Удалить
- `pm2 logs` — Логи
- `pm2 list` — Список процессов

---

## Конфигурационный файл (.env)

**Что это такое:**
- `.env` — скрытый файл для хранения переменных окружения (токены, пароли, порты)
- Не загружается в Git (добавлен в `.gitignore`)
- Загружается через `require('dotenv').config()`

**Пример содержимого `.env`:**
```env
BASE_URL=https://promedufa.promedweb.ru
USERNAME=
PASSWORD=
CERT_ID=
PORT=3000
