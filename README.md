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
Host:   https://xxxx.trycloudflare.com/host
Client: https://xxxx.trycloudflare.com/client
```

- `Host`: コメントを流すPCで開く
- `Client`: スマホや別PCで開く

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
- `src/server.mjs`: HTTPサーバーの入口
- `src/comment-store.mjs`: SQLiteへの保存と読み込み
- `compose.yaml`: アプリとCloudflare TunnelのDocker設定

SQLite DBは起動時に実行環境内へ自動作成されます。`data/` は生成物なのでGitHubには含めません。

## マニュアル

詳しい説明は [docs/MANUAL.md](docs/MANUAL.md) を見てください。

## 開発確認

```bash
npm test
npm run check
```
