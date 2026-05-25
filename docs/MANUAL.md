# Komet Manual

## 仕組み

Clientから送ったコメントを、Host画面またはChrome拡張へリアルタイムに流します。

```text
Client: スマホ/別PC
  ↓
Cloudflareの一時URL
  ↓
このPCのtunnelコンテナ
  ↓
Kometコンテナ
  ↓
Host / Chrome拡張
```

DBは使っていません。コメントはKometサーバーのメモリ上だけに保持され、サーバーを起動し直すと消えます。

## 必要なもの

- Docker Desktop
- インターネット接続
- このプロジェクト一式

Node.jsをPCへ直接入れる必要はありません。

## 起動

```bash
sh start.sh
```

起動すると、次のようなURLが表示されます。

```text
Host:      https://xxxx.trycloudflare.com/host
Comment:   https://xxxx.trycloudflare.com/client
WebSocket: wss://xxxx.trycloudflare.com/ws/host
```

- `Host`: コメントを流すPCで開く
- `Comment`: スマホや別PCで開く
- `WebSocket`: Chrome拡張のpopupに入力する

このURLは一時URLです。起動し直すと変わることがあります。

## 停止

```bash
docker compose down
```

## よくあるトラブル

### URLが表示されない

Cloudflare TunnelのURL発行に時間がかかっている可能性があります。

```bash
docker compose logs tunnel
```

### コメントが流れない

HostまたはChrome拡張の接続先URLを確認して、ページを再読み込みしてください。

## 開発者向け

```bash
npm run check
npm test
```

主な責務:

- `src/server.mjs`: ルーティングとアプリ起動
- `src/comment-store.mjs`: 起動中コメントのメモリ保持
- `src/http-utils.mjs`: JSONレスポンスやリクエスト処理
- `src/static-files.mjs`: HTML/CSS/JSの配信
- `src/sse-hub.mjs`: Host画面向けリアルタイム配信
- `src/websocket-hub.mjs`: Chrome拡張向けリアルタイム配信
- `public/host/`: Host画面
- `public/client/`: コメント投稿画面
- `extension/`: Chrome拡張
