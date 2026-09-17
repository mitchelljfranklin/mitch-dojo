# Reverse Proxy

Put Caddy or nginx in front of the app for TLS and normal web serving.

## Why it matters beyond TLS

Two settings depend on your proxy being described correctly:

### `TRUSTED_PROXY_COUNT`

The app resolves client IPs (for rate limiting and audit) by walking the `X-Forwarded-For` chain, trusting the last N hops. Set it to your **real** proxy hop count:

| Setup | Value |
|---|---|
| App exposed directly (no proxy) | `0` (default) |
| One reverse proxy (Caddy/nginx) in front | `1` |
| Proxy → CDN/tunnel → app | count every trusted hop |

::: warning Wrong count = broken rate limiting
Too high: clients can spoof their IP and sidestep rate limits. Too low: every request shares the proxy's IP, so login throttling locks everyone out together. Match the real hop count.
:::

### `APP_URL`

Set the public base URL (`https://dojo.example.com`) — emails, portal links, and public pages are built from it.

## Keep the app port private

In production, don't publish port 3000 on the public interface — let only the proxy reach it (Docker network or firewall rule).

## Caddy example

```
dojo.example.com {
    reverse_proxy localhost:3000
}
```

Automatic TLS, no further config. `TRUSTED_PROXY_COUNT=1`.

## nginx example

```nginx
server {
    listen 443 ssl;
    server_name dojo.example.com;
    # certificate config here

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## HSTS

The app sets security headers (including a nonce-based CSP) but delegates HSTS to the proxy — add it there, e.g. Caddy handles it by default.
