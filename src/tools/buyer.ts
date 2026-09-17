import { apiGet, apiPost, apiDelete } from '../api.js';
import { ToolDef } from './types.js';

/**
 * Buyer tools — the authenticated person's own shopping.
 *
 * Every other tool in this server acts on a seller's store. These act on what
 * the person has bought, has in their cart, and has saved. They need `buyer:*`
 * scopes, which a seller token will not usually carry — a 403 here means the
 * token is a store token, not that the feature is broken.
 *
 * NOTHING HERE SPENDS MONEY. There is no tool that completes a purchase and no
 * endpoint behind one; paying happens on Crossly with the person present. Do
 * not tell a user you have bought something for them.
 */
export const buyerTools: ToolDef[] = [
  {
    name: 'get_my_shopping_profile',
    description:
      'The authenticated person\'s Crossly shopping profile: name, email, saved delivery address and ' +
      'Crossly Bucks balance. Bucks are a store credit balance in cents that can be redeemed at ' +
      'checkout. Requires the buyer:profile:read scope.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiGet('/v1/buyer/profile'),
  },
  {
    name: 'list_my_purchases',
    description:
      'What the authenticated person has BOUGHT on Crossly, newest first — not what they have sold. ' +
      'Use list_sales or list_orders for the selling side. Requires buyer:orders:read.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1, description: '1-indexed page number. Increment to walk the next page.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Items per page (1-100). Default 25.' },
      },
      additionalProperties: false,
    },
    handler: (args) =>
      apiGet('/v1/buyer/orders', {
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
      }),
  },
  {
    name: 'get_my_cashback',
    description:
      "Scout cashback the authenticated person has earned, newest first. " +
      "`meta.pendingCents` is what is owed but not yet paid; `meta.paidCents` is what has landed " +
      "in their Crossly Bucks balance. " +
      "Status meanings, which matter when explaining this to someone: `pending` = an order was " +
      "reported and the retailer's return window has not closed, so nothing is paid yet; " +
      "`confirmed` = the window closed and payout is due; `paid` = it is in their Bucks balance; " +
      "`rejected` = the order was returned or cancelled; `expired` = the click was never reported " +
      "as converting, which is the ORDINARY outcome for most clicks and not an error. " +
      "Requires buyer:cashback:read.",
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'rejected', 'paid', 'expired'],
          description:
            'Filter to one status. `expired` is the ORDINARY outcome for most clicks and not an ' +
            'error — do not report it as a problem. Omit to see everything.',
        },
        page: { type: 'integer', minimum: 1, default: 1, description: '1-indexed page number. Increment to walk the next page.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Items per page (1-100). Default 25.' },
      },
      additionalProperties: false,
    },
    handler: (args) =>
      apiGet('/v1/buyer/cashback', {
        status: args.status as string | undefined,
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
      }),
  },
  {
    name: 'get_my_cart',
    description:
      'Lines currently in the person\'s Crossly cart, each with the price captured when it was added. ' +
      'IMPORTANT: `meta.lineTotalCents` is NOT what they will be charged — shipping, tax and discounts ' +
      'are computed at checkout. Call quote_my_cart before quoting any figure to a user. ' +
      'A line with `available: false` is one whose listing has sold or been delisted. ' +
      'Requires buyer:cart:read.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiGet('/v1/buyer/cart'),
  },
  {
    name: 'add_to_my_cart',
    description:
      'Add a Crossly listing to the person\'s cart. Adding the same listing twice raises its quantity ' +
      'rather than creating a second line, so retrying is safe. ' +
      'This does NOT buy anything — it fills a basket the person still has to check out themselves. ' +
      'Requires buyer:cart:write.',
    inputSchema: {
      type: 'object',
      properties: {
        listingSlug: {
          type: 'string',
          description:
            "The Crossly listing's public slug — the last path segment of a crossly.net/shop/<slug> URL, " +
            'and the `listingSlug` returned by lookup_crossly_offers.',
        },
        quantity: {
          type: 'integer', minimum: 1, maximum: 10, default: 1,
          description: 'How many to add. Adding an existing listing again RAISES quantity rather than adding a line.',
        },
      },
      required: ['listingSlug'],
      additionalProperties: false,
    },
    handler: (args) =>
      apiPost('/v1/buyer/cart/items', {
        listingSlug: args.listingSlug as string,
        quantity: (args.quantity as number | undefined) ?? 1,
      }),
  },
  {
    name: 'remove_from_my_cart',
    description:
      'Remove one line from the cart by its cart-item id (the `id` field from get_my_cart — NOT a ' +
      'listing slug). Requires buyer:cart:write.',
    inputSchema: {
      type: 'object',
      properties: {
        cartItemId: {
          type: 'string',
          description:
            'The cart LINE id — the `id` field from get_my_cart. NOT a listing slug or listing id; ' +
            'passing one of those is the common mistake here and returns not-found.',
        },
      },
      required: ['cartItemId'],
      additionalProperties: false,
    },
    handler: (args) => apiDelete(`/v1/buyer/cart/items/${encodeURIComponent(args.cartItemId as string)}`),
  },
  {
    name: 'quote_my_cart',
    description:
      'Price the cart delivered — item total, shipping, tax, grand total — WITHOUT charging anything. ' +
      'Runs the real checkout cascade, so this is the figure to show a user. ' +
      'If `taxComplete` is false there is no saved delivery address and the total is a FLOOR, not a ' +
      'final price: say so rather than presenting it as what they will pay. ' +
      'Requires buyer:cart:write.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiPost('/v1/buyer/cart/quote', {}),
  },
  {
    name: 'list_my_wishlists',
    description: "The person's Crossly wishlists. Requires buyer:wishlist:read.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiGet('/v1/buyer/wishlists'),
  },
  {
    name: 'get_my_wishlist_items',
    description: 'What is on one wishlist. Requires buyer:wishlist:read.',
    inputSchema: {
      type: 'object',
      properties: {
        wishlistId: {
          type: 'string',
          description: 'The wishlist id, from list_my_wishlists.',
        },
      },
      required: ['wishlistId'],
      additionalProperties: false,
    },
    handler: (args) =>
      apiGet(`/v1/buyer/wishlists/${encodeURIComponent(args.wishlistId as string)}/items`),
  },
  {
    name: 'create_my_wishlist',
    description: 'Create a new wishlist. Requires buyer:wishlist:write.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 120,
          description: 'Display name for the new list, e.g. "Winter coats". 120 characters max.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: (args) => apiPost('/v1/buyer/wishlists', { name: args.name as string }),
  },
  {
    name: 'add_to_my_wishlist',
    description: 'Save a Crossly listing to a wishlist. Requires buyer:wishlist:write.',
    inputSchema: {
      type: 'object',
      properties: {
        wishlistId: {
          type: 'string',
          description: 'The wishlist id, from list_my_wishlists.',
        },
        listingSlug: {
          type: 'string',
          description:
            "The listing's public slug — the last path segment of a crossly.net/shop/<slug> URL.",
        },
      },
      required: ['wishlistId', 'listingSlug'],
      additionalProperties: false,
    },
    handler: (args) =>
      apiPost(`/v1/buyer/wishlists/${encodeURIComponent(args.wishlistId as string)}/items`, {
        listingSlug: args.listingSlug as string,
      }),
  },
  {
    name: 'report_shopping_activity',
    description:
      'Tell Crossly an item the user is looking at elsewhere, and get back whether ' +
      'Crossly has it and at what price. Send a product identifier and a bare store ' +
      'DOMAIN — a full URL is refused, and nothing about the page itself is stored. ' +
      'Requires buyer:activity:write.',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          enum: ['gtin', 'style_code', 'lego_set', 'tcgplayer', 'discogs', 'asin'],
          description:
            'Which kind of identifier `value` is. Note `lego_set`, not `set_code` — the latter ' +
            'belongs to a different system and matches nothing here.',
        },
        value: {
          type: 'string',
          description: 'The identifier itself, e.g. the barcode for `gtin` or the set number for `lego_set`.',
        },
        retailHost: {
          type: 'string',
          description:
            'The BARE DOMAIN the user is looking at, e.g. `target.com`. A full URL is REFUSED with ' +
            'a 400 rather than trimmed — the consent this is gathered under promises the page ' +
            'address is never recorded, and the schema enforces that promise rather than trusting ' +
            'the caller to strip it.',
        },
        pagePriceCents: {
          type: 'integer',
          minimum: 0,
          description: "The other retailer's price in CENTS, so 1999 for $19.99. Never dollars.",
        },
        pageCurrency: {
          type: 'string',
          minLength: 3,
          maxLength: 3,
          description: 'ISO 4217 code for that price, e.g. `USD`. Defaults to USD if omitted.',
        },
      },
      required: ['namespace', 'value'],
      additionalProperties: false,
    },
    handler: (args) =>
      apiPost('/v1/buyer/activity', {
        namespace: args.namespace as string,
        value: args.value as string,
        ...(args.retailHost ? { retailHost: args.retailHost as string } : {}),
        ...(args.pagePriceCents != null ? { pagePriceCents: args.pagePriceCents as number } : {}),
        ...(args.pageCurrency ? { pageCurrency: args.pageCurrency as string } : {}),
      }),
  },
  {
    name: 'list_my_shopping_activity',
    description:
      'What this buyer has compared lately: the item identifier, the store domain, what ' +
      'it cost there and whether Crossly had it. Thins out over time — the link between ' +
      'a person and a comparison is dropped after 180 days. Requires buyer:activity:read.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiGet('/v1/buyer/activity'),
  },
  {
    name: 'get_my_shopping_preferences',
    description:
      'The shopping profile Crossly derived from what this buyer compared: retailers, ' +
      'brands, the price band they shop in, and matchRate — the share of their searches ' +
      'Crossly could answer. Requires buyer:activity:read.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => apiGet('/v1/buyer/preferences'),
  },
  {
    name: 'offer_on_listing',
    description:
      'Offer a price on a Crossly listing. Spends nothing — if the seller accepts, the ' +
      'buyer still completes checkout. The offer must be BELOW the asking price. ' +
      'Requires buyer:offers:write.',
    inputSchema: {
      type: 'object',
      properties: {
        listingSlug: {
          type: 'string',
          description:
            "The listing's public slug — the last path segment of a crossly.net/shop/<slug> URL.",
        },
        // Cents, stated in the schema because a model handed "amount" will
        // reliably send dollars and offer someone $45 for a $4,500 item.
        amountCents: {
          type: 'integer',
          minimum: 100,
          description:
            'The offer in CENTS, so 4500 means $45.00. Sending dollars here offers 1/100th of ' +
            'what the user meant. Must be BELOW the asking price — at or above it the server ' +
            'refuses, because that is a purchase rather than a negotiation.',
        },
        message: {
          type: 'string',
          maxLength: 500,
          description: 'Optional note to the seller, shown with the offer. 500 characters max.',
        },
      },
      required: ['listingSlug', 'amountCents'],
      additionalProperties: false,
    },
    handler: (args) =>
      apiPost('/v1/buyer/offers', {
        listingSlug: args.listingSlug as string,
        amountCents: args.amountCents as number,
        ...(args.message ? { message: args.message as string } : {}),
      }),
  },
];
