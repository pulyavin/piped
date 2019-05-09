# Описание

Piped - это масштабируемая front-end шина для организации WebSocket API, написанная на NodeJS.

Не важно какой язык программирования для реализации back-end вы используете (PHP/Python/NodeJS/...), все, что вам нужно для организации WebSocket API - это Piped и RabbitMQ.

## Установка

Необходимо склонировать репозиторий проекта

```bash
git clone git@github.com:pulyavin/piped.git
```

Перейти в папку проекта и создать файл `.env`

```bash
cp .env.example .env
```

Установить npm-зависимости

```bash
yarn install
```

## Основные понятия

Каждый инстанс Piped - это нода. Для запуска ноды вам необходимо указать порт, на котором нода будет слушать соединения и имя ноды (числовое значение).

```bash
./piped --port 8080 --nodeId 1
```

После запуска, нода создаст для себя в RabbitMQ:
- `out-queue` очередь, в которую будут приходить все запросы от WebSocket API. Эту очередь должен обслуживать ваш back-end. И связанную с ней `out-exchange`;
- `in-queue` очередь, которую слушает нода. И связанную с ней `in-exchange`, в которую необходимо отправлять сообщения.

Также создается `mass-exchange`, которая связывается со всеми `in-exchange` всех нод. В нее необходимо отправлять события, которые возникают на back-end и которые необходимо донести до конкретного пользователя.

## Подключение к WebSocket API

После запуска ноды, будет доступно WebSocket-подключение:

```bash
ws://localhost:8080/api/{token}
```

Токен - это уникальный идентификатор сессии пользователя, который формируется и выдается на стороне вашего back-end. Получив токен, пользователь может открыть сколько угодно соединений c различными нодами Piped.

## Проксирование нод через nginx

Подняв несколько нод на разных хостах или на нескольких портах в пределах одного хоста - можно организовать проксирование к ним через nginx, что помимо балансировки может дать возможность подключения SSL-сертификата.

```conf
upstream piped-nodes {
    server localhost:8070;
    server localhost:8080;
    server localhost:8090;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    include snippets/ssl.conf;
    include snippets/ssl-params.conf;

    server_name api.you-project.com;

    location / {
        proxy_pass http://piped-nodes;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

# Общение пользователя с API

## События

При возникновении события на стороне back-end, для того, чтобы проинформировать пользователя необходимо отправить это событие в `mass-exchange`.

Любое событие представлено json-объектом со следующими полями:

| name    | type   | description                                                |
|---------|--------|------------------------------------------------------------|
| type    | string | Всегда "event"                                             |
| event   | string | Имя события                                                |
| token   | string | Токен, которому нужно отправить событие                    |
| payload | object | Необходимая информация для каждого события, если требуется |

```json
{
  "type": "event",
  "token": "123e4567-e89b-12d3-a456-426655440000",
  "event": "balance-changed",
  "payload": {
    "balance": 345.55
  }
}
```

## Методы

WebSocket-клиенты могут отправлять запросы. Эти запросы называются методами.

Любой вызов метода представлен json-объектом со следующими полями:

| name    | type   | description                                               |
|---------|--------|-----------------------------------------------------------|
| id      | mixed  | Уникальный идентификатор асинхронного запроса             |
| method  | string | Имя вызываемого метода                                    |
| payload | object | Необходимая информация для каждого метода, если требуется |

Пример:

```json
{
  "id": 1,
  "method": "get-article",
  "payload": {
    "articleId": 1
  }
}
```

Содержимое текущего вызова метода будет преобразовано и отправлено в `out-queue` текущей ноды. К структуре будет добавлено поле `token` с токеном текущего пользователя.

```json
{
  "id": 1,
  "token": "123e4567-e89b-12d3-a456-426655440000",
  "method": "get-article",
  "payload": {
    "articleId": 1
  }
}
```

После того, как back-end обработал запрос, необходимо отправить в `in-exchange` текущей ноды ответ.

Асинхронный ответ должен быть представлен json-структурой со следующими полями.

| name    | type   | description                                               |
|---------|--------|-----------------------------------------------------------|
| id      | mixed  | Уникальный идентификатор асинхронного запроса             |
| type    | string | Всегда "result"                                           |
| token   | string | Токен, которому нужно отправить ответ                     |
| method  | string | Метод, который был вызван                                 |
| payload | object | Необходимая информация для каждого метода, если требуется |

```json
{
  "id": 1,
  "type": "result",
  "token": "123e4567-e89b-12d3-a456-426655440000",
  "method": "get-article",
  "payload": {
    "articleId": 1
  }
}
```

Поле `id` не является обязательным. Если оно не будет передано в запрос, то и в результате ответа оно не должно присутствовать.

