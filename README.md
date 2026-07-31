# Komet

スマホや別PCのブラウザからコメントを投稿し、ホストPCのブラウザに表示するWebアプリです。

Cloudflare Tunnelを使うので、スマホとPCが同じWi-Fiである必要はありません。

## 必要なもの

- Docker Desktop
- インターネット接続

## 起動

```bash
make
```

表示されたURLを開きます。

```text
Host:      https://xxxx.trycloudflare.com/host
Comment:   https://xxxx.trycloudflare.com/client
WebSocket: wss://xxxx.trycloudflare.com/ws/host
```

- `Host`: コメントを流すPCで開く
- `Comment`: スマホや別PCで開く
- `WebSocket`: Chrome拡張のpopupに入力する

## 停止

```bash
make stop
```

## 補足

- URLは起動ごとに変わることがあります。
- コメントはメモリ上だけに保存されます。停止すると消えます。
- URLが出ないときは `docker compose logs tunnel` を確認します。

詳しい補足は [docs/MANUAL.md](docs/MANUAL.md) を見てください。

## 開発用

```bash
npm test
npm run check
```
