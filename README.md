# Komet

スマホや別PCのブラウザからコメントを投稿し、ホストPCの画面に流す小さなWebアプリです。

通信ルートはCloudflare Tunnelだけにしています。スマホとPCが同じWi-Fiである必要はありません。

## すぐ使う

```bash
sh start.sh
```

表示されたURLを開きます。
起動するたびに、前回までのコメントは全削除されます。

```text
Host:      https://xxxx.trycloudflare.com/host
Comment:   https://xxxx.trycloudflare.com/client
WebSocket: wss://xxxx.trycloudflare.com/ws/host
```

- `Host`: コメントを流すPCで開く
- `Comment`: スマホや別PCで開く
- `WebSocket`: Chrome拡張のpopupに入力する

## Chrome拡張で現在のページに流す

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」から `extension/` を選ぶ
4. 拡張機能のpopupを開き、`WebSocket` のURLを入力して保存する
5. `Comment` のURLからコメントを送る

URLを空にして保存するとWebSocket接続を閉じ、ページ上のoverlayも削除します。

## 止める

```bash
docker compose down
```

## コメントを全部消す

```bash
CONFIRM=reset sh reset-comments.sh
```

## 主なファイル

- `public/host/`: コメントを流すホスト画面
- `public/client/`: コメント投稿画面
- `public/shared/`: ブラウザ側の共通処理
- `extension/`: Chrome拡張
- `src/server.mjs`: HTTPサーバーの入口
- `src/comment-store.mjs`: SQLiteへの保存と読み込み
- `src/websocket-hub.mjs`: Chrome拡張向けWebSocket配信
- `compose.yaml`: アプリとCloudflare TunnelのDocker設定

SQLite DBは起動時に実行環境内へ自動作成されます。`data/` は生成物なのでGitHubには含めません。

## マニュアル

詳しい説明は [docs/MANUAL.md](docs/MANUAL.md) を見てください。

## 開発確認

```bash
npm test
npm run check
```
