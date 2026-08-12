# Контракт интеграции frontend ↔ backend

Этот документ описывает API, который **уже ожидает текущий frontend** в каталоге `frontend/`.

## 1. Базовый URL

Frontend собирает адрес так:

```text
{VITE_API_BASE_URL}{path}
```

Если переменная не задана, используется `/api`.

Пример локальной настройки `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

После изменения `.env.local` нужно перезапустить `npm run dev`.

Если backend использует префикс `/api/v1`, укажите:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Тогда frontend-ручка `/auth/login` фактически вызывается как
`http://localhost:8000/api/v1/auth/login`.

Рекомендуемый production-вариант — отдавать frontend и API через один домен:

```text
https://ctfmap.ru/        -> frontend
https://ctfmap.ru/api/*   -> backend
```

В таком случае переменную можно не задавать и избежать CORS.

## 2. Общие правила API

- Формат з��просов и ответов: JSON.
- Названия JSON-полей: `camelCase`.
- Кодировка: UTF-8.
- Все даты/время: ISO 8601. Для полей событий в текущей админ-форме нужны даты `YYYY-MM-DD`.
- Успешный ответ с данными возвращает сам объект или массив, **без обёрток** `data`, `result`, `items`.
- Успешный ответ без данных возвращает `204 No Content`.
- Таймаут frontend-запроса — 15 секунд.
- Во все запросы frontend отправляет `Accept: application/json`.
- Для JSON-тела отправляется `Content-Type: application/json`.
- Для `POST`/`PATCH` frontend также отправляет `X-Requested-With: XMLHttpRequest`.
- Авторизованные запросы содержат `Authorization: Bearer <accessToken>`.
- Во всех запросах используется `credentials: include`, чтобы браузер передавал refresh-cookie.

### Формат ошибки

Для любой ошибки backend должен вернуть HTTP-статус и плоский JSON:

```json
{
  "message": "Пользователь с таким email уже существует.",
  "code": "EMAIL_TAKEN",
  "field": "email",
  "details": {
    "email": "Email уже используется"
  }
}
```

Поля `code`, `field`, `details` необязательны. Поле `message` желательно всегда.
Не нужно оборачивать ошибку в `{ "error": { ... } }`: текущий frontend ожидает поля на верхнем уровне.

Рекомендуемые статусы:

| Статус | Значение |
|---|---|
| `400` | некорректный запрос |
| `401` | access/refresh token отсутствует, истёк или невалиден |
| `403` | пользователь авторизован, но не имеет нужной роли |
| `404` | сущность не найдена |
| `409` | конфликт username/email или состояния сущности |
| `422` | ошибка валидации полей |
| `429` | превышен rate limit |
| `500` | внутренняя ошибка |

## 3. Авторизация

Используется схема:

1. Короткоживущий JWT access token возвращается в JSON.
2. Frontend хранит access token **только в памяти**, не в `localStorage`.
3. Долгоживущий refresh token backend устанавливает в `HttpOnly` cookie.
4. После перезагрузки страницы frontend вызывает `/auth/refresh` и восстанавливает сессию.
5. Если любой защищённый запрос получил `401`, frontend один раз вызывает refresh и повторяет исходный запрос.

Рекомендации backend:

- access token: 10–15 минут;
- refresh token: 7–30 дней;
- refresh-token rotation при каждом обновлении;
- хранить в БД только хеш refresh token либо идентификатор серверной сессии;
- cookie: `HttpOnly`, `Secure` в production, `SameSite=Lax`, `Path=/api`;
- для реально cross-site-развёртывания потребуется `SameSite=None; Secure`;
- на refresh/logout проверять заголовок `Origin` по allowlist;
- не доверять `role`, `verified` или `userId` из клиен��а — брать пользователя из JWT/сессии.

### Структура пользователя

```ts
type UserRole = "participant" | "organizer" | "admin";

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  verified: boolean;
  createdAt: string;
  city?: string;
  organization?: string;
  telegram?: string;
}
```

Рекомендуется возвращать необязательные строковые поля либо строкой, либо не включать. Можно
согласовать `null`, но тогда типы frontend нужно отдельно изменить.

### `POST /auth/register`

Без авторизации.

Запрос:

```json
{
  "username": "neo_team",
  "email": "neo@example.com",
  "password": "long-password-123"
}
```

Валидация, которую обязательно повторить на backend:

- `username`: после trim минимум 3, максимум 64 символа;
- `email`: валидный email, максимум 254 символа, хранить в нормализованном виде;
- `password`: от 12 до 128 символов;
- по умолчанию `role = participant`, `verified = false`;
- username и email должны быть уникальными.

Успех: `204 No Content`.

Конфликт: `409`, например:

```json
{ "message": "Email уже используется.", "code": "EMAIL_TAKEN", "field": "email" }
```

### `POST /auth/login`

Без авторизации.

Запрос:

```json
{
  "identifier": "neo@example.com",
  "password": "long-password-123"
}
```

`identifier` может быть username или email. Поиск email рекомендуется выполнять без учёта регистра.

Успех: `200 OK`, установка refresh-cookie и ответ:

```json
{
  "accessToken": "eyJ...",
  "session": {
    "user": {
      "id": "usr_01",
      "username": "neo_team",
      "email": "neo@example.com",
      "role": "participant",
      "verified": false,
      "createdAt": "2026-08-12T10:00:00Z",
      "city": "Новосибирск",
      "organization": "NSU",
      "telegram": "@neo_team"
    },
    "expiresAt": "2026-08-12T10:15:00Z"
  }
}
```

Неверные данные: `401` с одинаковым сообщением для несуществующего пользователя и неверного пароля.
Нужен rate limit по IP и identifier.

После входа frontend отправляет `admin` на `/admin`, остальные роли — на `/profile`.

> В frontend временно есть локальный тестовый вход `admin` / `admin`, который не обращается к backend.
> Перед production его нужно удалить из `frontend/src/api/authApi.ts`.

### `POST /auth/refresh`

Access token не требуется. Refresh token читается из `HttpOnly` cookie.

Успех: `200 OK`, ротация refresh-cookie и **полный** ответ:

```json
{
  "accessToken": "eyJ...",
  "session": {
    "user": {
      "id": "usr_01",
      "username": "neo_team",
      "email": "neo@example.com",
      "role": "participant",
      "verified": false,
      "createdAt": "2026-08-12T10:00:00Z"
    },
    "expiresAt": "2026-08-12T10:15:00Z"
  }
}
```

Для восстановления сессии после загрузки страницы поле `session` обязательно.
При невалидной/истёкшей refresh-сессии: `401`, удалить cookie.

### `POST /auth/logout`

Frontend приложит access token, если он ещё есть, и refresh-cookie. Backend должен отзывать сессию
по refresh-cookie и удалять cookie даже тогда, когда access token уже истёк. Иначе после локального
logout браузер сохранит рабочую refresh-сессию. Для защиты ручки нужно проверять `Origin`/CSRF, а не
требовать обязательно действующий access token.

Успех: `204 No Content`.

## 4. Личный профиль

Все ручки требуют валидный access token. Пользователь определяется только по `sub` JWT.

### `GET /users/me`

Ответ `200`: объект `User` без обёртки.

### `PATCH /users/me`

Сейчас пользователь может менять только Telegram.

```json
{ "telegram": "@neo_team" }
```

Для удаления контакта:

```json
{ "telegram": "" }
```

Валидация непустого значения: `^@[A-Za-z0-9_]{5,32}$`.

Ответ `200`: полностью обновлённый объект `User`.

### `POST /users/me/password`

```json
{
  "currentPassword": "old-password-123",
  "newPassword": "new-password-456"
}
```

Правила:

- новый пароль 12–128 символов;
- новый пароль должен отличаться от текущего;
- после смены рекомендуется отозвать остальные refresh-сессии пользователя.

Успех: `204 No Content`.

Неверный текущий пароль:

```http
401 Unauthorized
```

```json
{
  "message": "Текущий пароль указан неверно.",
  "code": "INVALID_CURRENT_PASSWORD"
}
```

## 5. Административные ручки

Все `/admin/*` требуют:

- валидный access token;
- актуальную роль `admin`, перепроверенную backend по БД;
- `403 Forbidden` для participant/organizer;
- аудит критических изменений: кто, когда, что изменил.

### События

#### `GET /admin/events`

Ответ `200`: массив `AdminEvent[]` без обёртки.

#### `GET /admin/events/{id}`

Ответ `200`: один `AdminEvent`. Если не найден — `404`.

#### `PATCH /admin/events/{id}`

Запрос:

```json
{
  "title": "Siberian CTF 2026",
  "description": "Описание соревнования",
  "url": "https://example.com",
  "organizer": "SibCTF Team",
  "format": "offline",
  "difficulty": "Высокий",
  "startDate": "2026-08-20",
  "endDate": "2026-08-21",
  "city": "Новосибирск",
  "region": "novosibirsk-oblast",
  "lat": 55.0302,
  "lng": 82.9204,
  "tags": ["web", "pwn", "team"]
}
```

Обратите внимание: в запросе поле называется `region`, а в ответе — `regionId`; `tags` frontend
преобразует из строки формы в массив.

Ответ `200`: полностью обновлённый `AdminEvent`.

Структура `AdminEvent`:

```json
{
  "id": "evt_42",
  "slug": "sibctf-2026",
  "title": "Siberian CTF 2026",
  "shortTitle": "SibCTF",
  "category": "elite",
  "difficulty": "Высокий",
  "format": "offline",
  "regionId": "novosibirsk-oblast",
  "city": "Новосибирск",
  "lat": 55.0302,
  "lng": 82.9204,
  "rating": 4.8,
  "weight": 75,
  "organizer": "SibCTF Team",
  "url": "https://example.com",
  "description": "Описание",
  "tags": ["web", "pwn"],
  "status": "active",
  "source": "manual",
  "startDate": "2026-08-20",
  "endDate": "2026-08-21"
}
```

Enum:

- `category`: `elite | local | training`;
- `difficulty`: `Начальный | Средний | Высокий | Экспертный`;
- `format`: `online | offline | hybrid`;
- `status`: `active | draft | archived`.

### Пользователи

#### `GET /admin/users`

Ответ `200`: массив `User[]` без обёртки.

#### `GET /admin/users/{id}`

Ответ `200`: объект `User`; если не найден — `404`.

#### `PATCH /admin/users/{id}`

```json
{
  "username": "neo_team",
  "email": "neo@example.com",
  "role": "organizer",
  "verified": true,
  "city": "Новосибирск",
  "organization": "NSU"
}
```

Ответ `200`: полностью обновлённый `User`.

Backend обязан запретить опасные сценарии по бизнес-правилам, например снятие последнего администратора
или несанкционированное повышение роли. Изменение `role`/`verified` должно попадать в audit log.

### Заявки на верификацию

#### `GET /admin/verification`

Ответ `200`: массив:

```json
[
  {
    "id": "ver_01",
    "user": {
      "id": "usr_01",
      "username": "neo_team",
      "email": "neo@example.com",
      "role": "participant",
      "verified": false,
      "createdAt": "2026-08-12T10:00:00Z"
    },
    "submittedAt": "2026-08-12T11:00:00Z",
    "status": "pending",
    "details": "Предоставленные пользователем сведения",
    "contact": "@neo_team",
    "comment": ""
  }
]
```

#### `PATCH /admin/verification/{id}`

```json
{
  "status": "approved",
  "comment": "Данные подтверждены"
}
```

`status`: только `approved | rejected`. Для `rejected` frontend требует непустой комментарий;
backend должен валидировать это повторно. Повторная обработка уже закрытой заявки — `409`.

Ответ `200`: полностью обновлённая заявка. При `approved` изменение `user.verified` и закрытие заявки
нужно выполнить одной транзакцией.

### Заявки на публикацию соревнования

#### `GET /admin/registrations`

Ответ `200`: массив:

```json
[
  {
    "id": "reg_01",
    "title": "Siberian CTF 2026",
    "organizer": "SibCTF Team",
    "contact": "@sibctf",
    "startDate": "2026-08-20",
    "endDate": "2026-08-21",
    "format": "offline",
    "city": "Новосибирск",
    "region": "novosibirsk-oblast",
    "url": "https://example.com",
    "description": "Описание соревнования",
    "status": "pending",
    "comment": ""
  }
]
```

#### `PATCH /admin/registrations/{id}`

```json
{
  "status": "approved",
  "comment": "Допущено к публикации"
}
```

`status`: `approved | rejected`; при отклонении комментарий обязателен. Ответ `200`: обновлённая заявка.
При одобрении создание/публикацию события и закрытие заявки рекомендуется выполнять транзакционно.

## 6. Публичная карта

Сейчас карта и страницы соревнований читают демонстрационные данные из
`frontend/src/data/events.ts`, то есть ещё не вызывают backend.

Контракт будущих публичных ручек уже описан отдельно в файле
`требования по ручкам для карты.md`. Там предложены:

```text
GET /api/v1/events/map
GET /api/v1/events/{slug}
```

Перед подключением нужно унифицировать префикс API и привести публичный DTO к типу `CtfEvent` либо
добавить на frontend явный mapper. Нельзя просто заменить локальный массив запросом: сейчас локальный
`CtfEvent` использует `startOffsetDays`/`durationDays`, а контракт backend — абсолютные `startAt`/`endAt`.
Правильный вариант — использовать абсолютные ISO-даты от backend и адаптировать frontend.

## 7. CORS для локальной разработки

Если frontend работает на `http://localhost:5173`, а backend на `http://localhost:8000`, backend должен
отвечать минимум такими заголовками:

```http
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Vary: Origin
```

При `Allow-Credentials: true` нельзя использовать `Access-Control-Allow-Origin: *`.
Backend должен корректно отвечать на preflight `OPTIONS`.

Если команда использует и `localhost`, и `127.0.0.1`, оба origin нужно явно добавить в allowlist либо
всем использовать один вариант. Для cookie это разные host.

## 8. Развёртывание SPA

Маршруты `/login`, `/register`, `/profile`, `/admin/*`, `/events/*` обрабатывает React.
Веб-сервер должен:

1. проксировать `/api/*` в backend;
2. отдавать реальные статические файлы из `frontend/dist`;
3. для остальных неизвестных **не-API** маршрутов возвращать `frontend/dist/index.html`;
4. никогда не подменять API-ошибки HTML-файлом SPA.

## 9. Минимальная последовательность подключения

1. Backend реализует `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`.
2. Настраивает refresh-cookie, JWT, CORS и единый формат ошибок.
3. Реализует `/users/me` и `/users/me/password`.
4. Создаёт admin middleware и ручки `/admin/*`.
5. Frontend получает `VITE_API_BASE_URL` и запускается через `npm run dev`.
6. Проверяются сценарии: регистрация → вход → F5/refresh → профиль → истечение access token → logout.
7. Проверяется запрет `/admin/*` для participant и доступ для admin.
8. Удаляется тестовый вход `admin/admin`.
9. Отдельно подключаются публичные данные карты.

## 10. Чек-лист приёмки backend

- [ ] Все ответы используют camelCase и точные enum из контракта.
- [ ] Массивы не обёрнуты в `items`/`data`.
- [ ] Пустые успешные ответы имеют статус 204.
- [ ] Login и refresh возвращают `accessToken` и `session.user`.
- [ ] Refresh-cookie имеет `HttpOnly` и корректно удаляется при logout.
- [ ] `401` запускает refresh; `403` не используется вместо истёкшего токена.
- [ ] CORS разрешает credentials и конкретный origin frontend.
- [ ] Пароли хешируются Argon2id или bcrypt и никогда не возвращаются в API/логах.
- [ ] Регистрация, login и refresh защищены rate limit.
- [ ] Роли и доступ проверяет backend, а не только React.
- [ ] Критические admin-изменения записываются в audit log.
- [ ] Протестированы duplicate email/username, неверный пароль, истёкший access/refresh token.
- [ ] Для SPA настроен fallback на `index.html`, но только вне `/api/*`.
