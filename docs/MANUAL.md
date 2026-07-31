# Komet Manual

## 必要なもの

- Docker Desktop
- インターネット接続
- このプロジェクト一式

Node.jsをPCへ直接入れる必要はありません。

## 起動

```bash
make
```

表示されたURLを用途に合わせて開きます。

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

## よくあるトラブル

### URLが表示されない

Cloudflare TunnelのURL発行に失敗しています。ログを確認します。

```bash
docker compose logs tunnel
```

`api.trycloudflare.com/tunnel` はCloudflare側の発行APIです。共有用URLではありません。

`tls: failed to verify certificate` が出る場合は、VPN、プロキシ、大学/会社Wi-Fi、セキュリティソフトの証明書設定を疑ってください。別Wi-Fiやテザリングで試すのが早いです。

### コメントが流れない

Host画面またはChrome拡張の接続先URLを確認して、ページを再読み込みしてください。

## 開発者向け

```bash
npm run check
npm test
```
