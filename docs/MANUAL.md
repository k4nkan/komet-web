# Komet Manual

## 仕組み

このアプリは、Clientから送ったコメントを、Hostの画面に右から左へ流すシステムです。

スマホとPCは同じWi-Fiでなくて大丈夫です。通信はCloudflare Tunnelだけを使います。

```text
Client: スマホ/別PC
  ↓
Cloudflareの一時URL
  ↓
このPCのtunnelコンテナ
  ↓
Kometコンテナ
  ↓
SQLite DB
  ↓
Host: コメント表示画面
```

コメントは起動中の実行環境内にあるSQLite DBへ保存されます。起動するたびに全削除されるため、GitHubにDBファイルや `data/` を含める必要はありません。

## 必要なもの

- Docker Desktop
- インターネット接続
- このプロジェクト一式

Node.jsやSQLiteをPCへ直接入れる必要はありません。

## 起動

プロジェクトフォルダで次を実行します。

```bash
sh start.sh
```

起動すると、次のようなURLが表示されます。
起動するたびに、前回までのコメントは全削除されます。

```text
Host:   https://xxxx.trycloudflare.com/host
Client: https://xxxx.trycloudflare.com/client
```

使い方:

- `Host` を投影用PCで開く
- `Client` をスマホや別PCで開く
- 投稿すると `Host` にコメントが流れる

このURLは一時URLです。起動し直すと変わることがあります。

旧URLの `/screen` と `/comment` も互換用に使えます。

## 停止

```bash
docker compose down
```

これでアプリ本体とCloudflare Tunnelの両方が止まります。

## コメントを全部消す

```bash
CONFIRM=reset sh reset-comments.sh
```

コメントは全削除され、IDも1から振り直されます。

Docker起動時のDBはコンテナ内に作られます。ホスト側へDBファイルを残す運用にはしていません。

## よくあるトラブル

### URLが表示されない

Cloudflare TunnelのURL発行に時間がかかっている可能性があります。

```bash
docker compose logs tunnel
```

ログの中に `https://xxxx.trycloudflare.com` が出ているか確認します。

### Clientは開けるが、コメントが流れない

Hostを再読み込みしてください。

```text
https://xxxx.trycloudflare.com/host
```

このアプリはリアルタイム配信に加えて、1.6秒ごとにDBを見に行く仕組みも持っています。少し待つと流れる場合があります。

### 古いURLを開いている

`sh start.sh` を実行し直すとURLが変わることがあります。古いURLを閉じて、新しく表示されたURLを使ってください。

### データが保存されているか確認したい

```bash
docker compose exec -T komet node --input-type=module -e "
  import { DatabaseSync } from 'node:sqlite';
  const db = new DatabaseSync('/app/data/comments.sqlite');
  console.log(db.prepare('SELECT id, name, text, created_at FROM comments ORDER BY id DESC LIMIT 10').all());
  db.close();
"
```

## 開発者向け

構文チェックとテスト:

```bash
npm run check
npm test
```

主な責務:

- `src/server.mjs`: ルーティングとアプリ起動
- `src/comment-store.mjs`: SQLite操作
- `src/http-utils.mjs`: JSONレスポンスやリクエスト処理
- `src/static-files.mjs`: HTML/CSS/JSの配信
- `src/sse-hub.mjs`: リアルタイム配信
- `public/host/`: Host画面
- `public/client/`: Client投稿画面
- `public/shared/`: ブラウザからサーバーへ通信する共通処理
