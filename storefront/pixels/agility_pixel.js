// ============================================================
// This Data Layer is owned by Agility Ads Company.
// Unauthorized copying or distribution is prohibited.
// V.6.3. Purchase Update
// ============================================================
// MODIFIED 2026-09-01 (Grande Cosmetics) — consent gating added.
//
// As shipped, this pixel had no consent logic: it loaded its GTM container and
// pushed every event, including the raw site-search query, regardless of the
// visitor's choice. It now denies by default, syncs from Shopify's Customer
// Privacy API, loads GTM only once consent allows, and gates every handler.
//
// If Agility ships a new version of this data layer, THESE CHANGES MUST BE
// RE-APPLIED — a straight vendor paste-over silently removes all of it.
// ============================================================

// ---------- Consent ----------
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }

// Deny everything before GTM loads or any event fires. Google's own tags read
// these signals; the per-handler guards below cover everything else.
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
});

// Each custom pixel runs in its own sandboxed iframe with its own window, so the
// theme's Consent Mode defaults do not reach this code. Consent has to be read
// from Shopify here, independently.
let consent = init.customerPrivacy || {};

const canAnalytics = () => consent.analyticsProcessingAllowed === true;
const canMarketing = () => consent.marketingAllowed === true;

// GTM is loaded lazily: nothing is requested from googletagmanager.com until the
// visitor has granted something. Events that fire before then are dropped by the
// guards rather than queued, so no pre-consent data is waiting to be flushed.
let gtmLoaded = false;
function loadGtm() {
  if (gtmLoaded) return;
  if (!canAnalytics() && !canMarketing()) return;
  gtmLoaded = true;
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', 'GTM-T672VVBN');
}

function syncConsent(c) {
  consent = c || {};
  gtag('consent', 'update', {
    ad_storage: canMarketing() ? 'granted' : 'denied',
    ad_user_data: canMarketing() ? 'granted' : 'denied',
    ad_personalization: canMarketing() ? 'granted' : 'denied',
    analytics_storage: canAnalytics() ? 'granted' : 'denied',
  });

  // Expose the state to container GTM-T672VVBN so tags there can gate on it,
  // which matters because Consent Mode alone only auto-enforces Google's tags.
  window.dataLayer.push({
    event: 'shopify_consent_updated',
    analytics_allowed: canAnalytics(),
    marketing_allowed: canMarketing(),
    consent_at: new Date().toISOString(),
  });

  loadGtm();
}

syncConsent(init.customerPrivacy);
api.customerPrivacy.subscribe('visitorConsentCollected', (e) => syncConsent(e.customerPrivacy));


/* ========== Page Viewed ========== */
analytics.subscribe("page_viewed", (event) => {
  if (!canAnalytics()) return;
  const path = event.context?.document?.location?.pathname || "";
  const isProductPage = /\/products\/[^\/]+/.test(path);
  const isCollectionPage = !isProductPage && /\/collections\/[^\/]+/.test(path);

  dataLayer.push({
    event: "custom_user_id_available",
    page_url: event.context?.document?.location?.href || "",
    page_path: path,
    page_referrer: event.context?.document?.referrer || "",
    is_product_page: isProductPage,
    is_collection_page: isCollectionPage
  });
});

/* ========== Purchase ========== */
analytics.subscribe("checkout_completed", (event) => {
  if (!canAnalytics()) return;
  dataLayer.push({ ecommerce: null });

  const items = event.data?.checkout?.lineItems?.map((item) => {
    return {
      item_id: item.variant?.product?.id || "",
      item_name: item.variant?.product?.title || "",
      item_sku: item.variant?.sku || item.variant?.id || "",
      price: item.variant?.price?.amount || 0,
      quantity: item.quantity || 1
    };
  }) || [];

  const allItemNames = items.map(i => i.item_name).filter(Boolean).join("- ");
  const allItemSkus  = items.map(i => i.item_sku).filter(Boolean).join(" - ");

  const agilityQuantityTotal = items.reduce((sum, i) => {
    const q = parseInt(i.quantity, 10);
    return sum + (isNaN(q) ? 0 : q);
  }, 0);

  const allItemQuantities = items.map(i => i.quantity).filter(Boolean).join(" - ");

  dataLayer.push({
    event: "agility_purchase",
    all_item_names: allItemNames,
    all_item_skus: allItemSkus,
    agility_quantity_total: agilityQuantityTotal,
    all_item_quantities: allItemQuantities,
    ecommerce: {
      currency: event.data?.checkout?.currencyCode || "USD",
      value: event.data?.checkout?.subtotalPrice?.amount || 0,
      transaction_id: event.data?.checkout?.order?.id || "unknown",
      coupon: event.data?.checkout?.discountAllocations?.[0]?.discount?.code || "",
      shipping: event.data?.checkout?.shippingLine?.price?.amount || 0,
      tax: event.data?.checkout?.totalTax?.amount || 0,
      items: items
    }
  });
});


/* ========== Add to Cart ========== */
analytics.subscribe("product_added_to_cart", (event) => {
  if (!canAnalytics()) return;
  dataLayer.push({ ecommerce: null });

  const unitPrice = parseFloat(event.data?.cartLine?.merchandise?.price?.amount) || 0;
  const qty = parseInt(event.data?.cartLine?.quantity) || 1;
  const totalValue = unitPrice * qty;

  dataLayer.push({
    event: "agility_add_to_cart",
    agility_quantity: qty,
    agility_add_to_cart_total: totalValue,
    ecommerce: {
      currency: event.data?.cartLine?.merchandise?.price?.currencyCode || "USD",
      value: totalValue,
      items: [
        {
          item_id: event.data?.cartLine?.merchandise?.product?.id || "",
          item_name: event.data?.cartLine?.merchandise?.product?.title || "",
          item_sku: event.data?.cartLine?.merchandise?.sku || event.data?.cartLine?.merchandise?.id || "",
          price: unitPrice,
          quantity: qty
        }
      ]
    }
  });
});




/* ========== View Item ========== */
analytics.subscribe("product_viewed", (event) => {
  if (!canAnalytics()) return;
  dataLayer.push({ ecommerce: null });

  dataLayer.push({
    event: "agility_view_item",
    ecommerce: {
      currency: event.data?.productVariant?.price?.currencyCode || "USD",
      value: event.data?.productVariant?.price?.amount || 0,
      items: [
        {
          item_id: event.data?.productVariant?.product?.id || "",
          item_name: event.data?.productVariant?.product?.title || "",
          item_sku: event.data?.productVariant?.sku || event.data?.productVariant?.id || "",
          price: event.data?.productVariant?.price?.amount || 0,
          quantity: 1
        }
      ]
    }
  });
});


/* ========== Collection Viewed ========== */
analytics.subscribe("collection_viewed", (event) => {
  if (!canAnalytics()) return;
  const collection = event.data?.collection;

  const products = collection?.productVariants?.map((variant) => {
    return {
      item_id: variant?.product?.id || "",
      item_name: variant?.product?.title || "",
      item_sku: variant?.sku || variant?.id || "",
      price: variant?.price?.amount || 0
    };
  }) || [];

  const allItemNames = products.map(p => p.item_name).filter(Boolean).join("- ");
  const allItemSkus  = products.map(p => p.item_sku).filter(Boolean).join(" - ");

  dataLayer.push({
    event: "agility_view_item_list",
    item_list_id: collection?.id || "",
    item_list_name: collection?.title || "",
    all_item_names: allItemNames,
    all_item_skus: allItemSkus,
    ecommerce: {
      items: products
    }
  });
});


/* ========== Search Submitted ========== */
analytics.subscribe("search_submitted", (event) => {
  // The raw search query is the data element at issue in the privacy demand, and
  // container GTM-T672VVBN has no per-tag consent configured yet — so anything
  // pushed here is reachable by ad tags. Treat search as marketing scope until
  // that container work lands, then this can relax to analytics-only.
  if (!canAnalytics() || !canMarketing()) return;
  const itemNames = event.data?.searchResult?.productVariants
    ?.map(item => item.product?.title)
    ?.filter(Boolean)
    ?.join("- ") || "";

  const itemSkus = event.data?.searchResult?.productVariants
    ?.map(item => item?.sku || item?.id)
    ?.filter(Boolean)
    ?.join(" - ") || "";

  dataLayer.push({
    event: "agility_search",
    search_term: event.data?.searchResult?.query || "",
    all_item_names: itemNames,
    all_item_skus: itemSkus
  });
});


/* ========== Begin Checkout ========== */
analytics.subscribe("checkout_started", (event) => {
  if (!canAnalytics()) return;
  dataLayer.push({ ecommerce: null });

  const items = event.data?.checkout?.lineItems?.map((item) => {
    return {
      item_id: item.variant?.product?.id || "",
      item_name: item.variant?.product?.title || "",
      item_sku: item.variant?.sku || item.variant?.id || "",
      price: item.variant?.price?.amount || 0,
      quantity: item.quantity || 1
    };
  }) || [];

  const allItemNames = items.map(i => i.item_name).filter(Boolean).join(" - ");
  const allItemIds   = items.map(i => i.item_id).filter(Boolean).join(" - ");
  const allItemSkus  = items.map(i => i.item_sku).filter(Boolean).join(" - ");

  dataLayer.push({
    event: "agility_begin_checkout",
    all_item_names: allItemNames,
    all_item_ids: allItemIds,
    all_item_skus: allItemSkus,
    ecommerce: {
      currency: event.data?.checkout?.currencyCode || "USD",
      value: event.data?.checkout?.subtotalPrice?.amount || 0,
      items: items
    }
  });
});


/* ========== View Cart ========== */
analytics.subscribe("cart_viewed", (event) => {
  if (!canAnalytics()) return;
  dataLayer.push({ ecommerce: null });

  const items = event.data?.cart?.lines?.map((line) => {
    return {
      item_id: line.merchandise?.product?.id || "",
      item_name: line.merchandise?.product?.title || "",
      item_sku: line.merchandise?.sku || line.merchandise?.id || "",
      price: line.merchandise?.price?.amount || 0,
      quantity: line.quantity || 1
    };
  }) || [];

  const allItemNames = items.map(i => i.item_name).filter(Boolean).join("- ");
  const allItemSkus  = items.map(i => i.item_sku).filter(Boolean).join(" - ");

  dataLayer.push({
    event: "agility_view_cart",
    all_item_names: allItemNames,
    all_item_skus: allItemSkus,
    ecommerce: {
      currency: event.data?.cart?.cost?.totalAmount?.currencyCode || "USD",
      value: event.data?.cart?.cost?.totalAmount?.amount || 0,
      items: items
    }
  });
});
