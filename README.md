# @crossly/buyer-mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for the **Crossly Buyer API** — lets an AI agent act on a person's own shopping.

> **Not on npm yet.** `@crossly/buyer-mcp` is unreleased — the command below
> will 404 until the first publish. To try it now, clone this repo and build from
> source. Star or watch to hear when it lands.

```bash
npx -y @crossly/buyer-mcp
```

## This is not the seller server

[`@crossly/mcp`](https://github.com/crossly-dev/crossly-mcp) drives a seller's **store** — listings, crossposting, fulfilment. This drives a shopper's **account** — cart, orders, wishlists, offers, cashback.

Different API, different principal, different token. Run both in one host if you like; they read different env vars precisely so that works.

## Nothing here spends money

No tool completes a purchase and no endpoint sits behind one. `quote_my_cart` prices a basket; `offer_on_listing` proposes a number a seller may accept, after which **the person still completes checkout themselves**.

An agent must never tell a user it has bought something.

## Configure

Claude Desktop (`claude_desktop_config.json`), Cursor, Cline — same shape everywhere:

```json
{
  "mcpServers": {
    "crossly-buyer": {
      "command": "npx",
      "args": ["-y", "@crossly/buyer-mcp"],
      "env": {
        "CROSSLY_BUYER_TOKEN": "crossly_oat_..."
      }
    }
  }
}
```

`CROSSLY_BUYER_TOKEN` is a **buyer OAuth token** carrying `buyer:*` scopes, obtained by sending the shopper through the Crossly consent screen. There is no buyer equivalent of a personal access token, because these scopes are granted by a person agreeing to them.

Hand it a seller `crossly_pat_…` and it refuses at startup with a message saying which token it wanted — rather than a 403 on the agent's first tool call, which reads as a broken tool.

## Tools (15)

| | |
|---|---|
| `get_my_shopping_profile` | name, email, saved address, Bucks balance |
| `list_my_purchases` | what they **bought** — not what they sold |
| `get_my_cashback` | Scout cashback, with status meanings |
| `get_my_cart` / `add_to_my_cart` / `remove_from_my_cart` | the basket |
| `quote_my_cart` | price it delivered, **without charging** |
| `list_my_wishlists` / `get_my_wishlist_items` | saved lists |
| `create_my_wishlist` / `add_to_my_wishlist` | build them |
| `report_shopping_activity` | contribute a comparison signal, get the answer back |
| `list_my_shopping_activity` / `get_my_shopping_preferences` | what they compared, and what we derived |
| `offer_on_listing` | propose a price below asking |

## Scopes are enforced server-side

A token without `buyer:cashback:read` simply cannot call `get_my_cashback` — the tool returns the API's refusal rather than pretending. Cashback is deliberately a separate grant from orders: an app that reads what you bought has no automatic business knowing what you earned.

## Two notes for agents

**Money is always cents.** `amountCents`, `totalCents`, `bucksBalanceCents`. Never present the raw integer as dollars.

**A cart quote is a floor.** `taxComplete: false` means no delivery address is known, so shipping and tax are incomplete. Say so rather than quoting the total as final.

## Also available

- [`@crossly/buyer-sdk`](https://github.com/crossly-dev/crossly-buyer-sdk) — TypeScript client
- [`@crossly/buyer-cli`](https://github.com/crossly-dev/crossly-buyer-cli) — `crossly-buyer` on the command line

## License

MIT
