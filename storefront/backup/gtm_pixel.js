// Consent 
window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }

// Default everything DENIED before GTM loads
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied',
  ad_personalization: 'denied', analytics_storage: 'denied',
});

// Track Shopify's consent state and push updates to Consent Mode
let consent = init.customerPrivacy || {};
function syncConsent(c) {
  consent = c || {};
  gtag('consent', 'update', {
    ad_storage:         consent.marketingAllowed ? 'granted' : 'denied',
    ad_user_data:       consent.marketingAllowed ? 'granted' : 'denied',
    ad_personalization: consent.marketingAllowed ? 'granted' : 'denied',
    analytics_storage:  consent.analyticsProcessingAllowed ? 'granted' : 'denied',
  });
}
syncConsent(init.customerPrivacy);
api.customerPrivacy.subscribe('visitorConsentCollected', (e) => syncConsent(e.customerPrivacy));

const canAnalytics = () => consent.analyticsProcessingAllowed === true;
const canMarketing = () => consent.marketingAllowed === true;

console.log(`[Shopify Pixel] ${canAnalytics()}`);

// initialize GTM tag
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", "GTM-WPNHLMK");

// standard events

analytics.subscribe("page_viewed", (event) => {
  if (!canAnalytics()) return;
  
  const pageviewEventPayload = {
    event: "page_viewed",
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    hostname: event.context.document.location.hostname,
    page_title: event.context.document.title,
    referrer: event.context.document.referrer,
  };
  window.dataLayer.push(pageviewEventPayload);
  console.log(pageviewEventPayload);
});

// standard ecommerce events

analytics.subscribe("checkout_started", (event) => {
  if (!canAnalytics()) return;
  
  const checkout = event.data.checkout;
  const customerEventPayload = {
    event: "customer_data",
    customer_id: checkout?.order?.customer?.id,
    customer_email: checkout?.email,
    customer_first_name: checkout?.shippingAddress?.firstName,
    customer_phone: checkout?.shippingAddress?.phone,
    customer_last_name: checkout?.shippingAddress?.lastName,
    customer_city: checkout?.shippingAddress?.city,
    customer_zip: checkout?.shippingAddress?.zip,
    customer_address_1: checkout?.shippingAddress?.address1,
    customer_address_2: checkout?.shippingAddress?.address2,
    customer_country_code: checkout?.shippingAddress?.countryCode,
    customer_province: checkout?.shippingAddress?.province,
  };
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "begin_checkout",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: checkout?.subtotalPrice?.amount,
      checkout_token: checkout?.token,
      coupon: checkout?.discountApplications?.[0]?.title,
      items: checkout?.lineItems.map((item) => {
        // Calculate the total discount for the item
        const totalItemDiscount = item?.discountAllocations?.reduce(
          (acc, discountAllocation) => {
            return acc + discountAllocation?.amount?.amount;
          },
          0
        );

        return {
          item_id: "shopify_US_".concat(
            item?.variant?.product?.id,
            "_",
            item?.variant?.id
          ),
          item_name: item?.title,
          affiliation: item?.variant?.product?.vendor.concat(" Store"),
          sku: item?.variant?.sku,
          variant_id: item?.variant?.id,
          product_id: item?.variant?.product?.id,
          discount: totalItemDiscount,
          item_brand: item?.variant?.product?.vendor,
          item_category: item?.variant?.product?.type,
          item_variant: item?.variant?.title,
          price: item?.variant?.price?.amount - totalItemDiscount,
          quantity: item?.quantity,
        };
      }),
    },
  };
  window.dataLayer.push(customerEventPayload);
  console.log(customerEventPayload);
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("checkout_shipping_info_submitted", (event) => {
  if (!canAnalytics()) return;
  
  const checkout = event.data.checkout;
  const customerEventPayload = {
    event: "customer_data",
    customer_id: checkout?.order?.customer.id,
    customer_email: checkout?.email,
    customer_first_name: checkout?.shippingAddress?.firstName,
    customer_phone: checkout?.shippingAddress?.phone,
    customer_last_name: checkout?.shippingAddress?.lastName,
    customer_city: checkout?.shippingAddress?.city,
    customer_zip: checkout?.shippingAddress?.zip,
    customer_address_1: checkout?.shippingAddress?.address1,
    customer_address_2: checkout?.shippingAddress?.address2,
    customer_country_code: checkout?.shippingAddress?.countryCode,
    customer_province: checkout?.shippingAddress?.province,
  };
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "add_shipping_info",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: checkout?.subtotalPrice?.amount,
      checkout_token: checkout?.token,
      coupon: checkout?.discountApplications?.[0]?.title,
      items: checkout?.lineItems.map((item) => {
        // Calculate the total discount for the item, safely handling potential undefined values
        const totalItemDiscount = item?.discountAllocations?.reduce(
          (acc, discountAllocation) => {
            // Safely access discountAllocation.amount.amount, default to 0 if undefined
            return acc + (discountAllocation?.amount?.amount ?? 0);
          },
          0 // Initial value for the accumulator
        );

        return {
          item_id: "shopify_US_".concat(
            item?.variant?.product?.id,
            "_",
            item?.id
          ),
          item_name: item?.title,
          affiliation: item?.variant?.product?.vendor.concat(" Store"),
          sku: item?.variant?.sku,
          variant_id: item?.id,
          product_id: item?.variant?.product?.id,
          discount: totalItemDiscount,
          item_brand: item?.variant?.product?.vendor,
          item_category: item?.variant?.product?.type,
          item_variant: item?.variant?.title,
          price: item?.variant?.price?.amount - totalItemDiscount,
          quantity: item?.quantity,
        };
      }),
    },
  };
  window.dataLayer.push(customerEventPayload);
  console.log(customerEventPayload);
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("payment_info_submitted", (event) => {
  if (!canAnalytics()) return;
  
  const checkout = event.data.checkout;
  const customerEventPayload = {
    event: "customer_data",
    customer_id: checkout?.order?.customer.id,
    customer_email: checkout?.email,
    customer_first_name: checkout?.shippingAddress?.firstName,
    customer_phone: checkout?.shippingAddress?.phone,
    customer_last_name: checkout?.shippingAddress?.lastName,
    customer_city: checkout?.shippingAddress?.city,
    customer_zip: checkout?.shippingAddress?.zip,
    customer_address_1: checkout?.shippingAddress?.address1,
    customer_address_2: checkout?.shippingAddress?.address2,
    customer_country_code: checkout?.shippingAddress?.countryCode,
    customer_province: checkout?.shippingAddress?.province,
  };
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "add_payment_info",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: checkout?.subtotalPrice?.amount,
      checkout_token: checkout?.token,
      coupon: checkout?.discountApplications?.[0]?.title,
      items: checkout?.lineItems.map((item) => {
        // Calculate the total discount for the item, safely handling potential undefined values
        const totalItemDiscount = item?.discountAllocations?.reduce(
          (acc, discountAllocation) => {
            // Safely access discountAllocation.amount.amount, default to 0 if undefined
            return acc + (discountAllocation?.amount?.amount ?? 0);
          },
          0 // Initial value for the accumulator
        );

        return {
          item_id: "shopify_US_".concat(
            item?.variant?.product?.id,
            "_",
            item?.id
          ),
          item_name: item?.title,
          affiliation: item?.variant?.product?.vendor?.concat(" Store"),
          sku: item?.variant?.sku,
          variant_id: item?.id,
          product_id: item?.variant?.product?.id,
          discount: totalItemDiscount,
          item_brand: item?.variant?.product?.vendor,
          item_category: item?.variant?.product?.type,
          item_variant: item?.variant?.title,
          price: item?.variant?.price?.amount - totalItemDiscount,
          quantity: item?.quantity,
        };
      }),
    },
  };
  window.dataLayer.push(customerEventPayload);
  console.log(customerEventPayload);
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("checkout_completed", (event) => {
  if (!canAnalytics()) return;
  
  console.log(event);
  const checkout = event.data.checkout;
  const customer = init.data.customer;
  const customerEventPayload = {
    event: "customer_data",
    customer_id: checkout?.order?.customer.id,
    customer_email: checkout?.email,
    customer_first_name: checkout?.shippingAddress?.firstName,
    customer_phone: checkout?.shippingAddress?.phone,
    customer_last_name: checkout?.shippingAddress?.lastName,
    customer_city: checkout?.shippingAddress?.city,
    customer_zip: checkout?.shippingAddress?.zip,
    customer_address_1: checkout?.shippingAddress?.address1,
    customer_address_2: checkout?.shippingAddress?.address2,
    customer_country_code: checkout?.shippingAddress?.countryCode,
    customer_province: checkout?.shippingAddress?.province,
  };
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "purchase",
    ecommerce: {
      transaction_id: checkout?.order?.id,
      currency: checkout?.currencyCode,
      value: checkout?.subtotalPrice?.amount,
      total_value: event.data?.checkout?.totalPrice?.amount,
      tax: checkout?.totalTax.amount,
      shipping: checkout?.shippingLine.price?.amount,
      checkout_token: checkout?.token,
      coupon: checkout?.discountApplications?.[0]?.title,
      items: checkout?.lineItems.map((item) => {
        // Calculate the total discount for the item, safely handling potential undefined values
        const totalItemDiscount = item?.discountAllocations?.reduce(
          (acc, discountAllocation) => {
            // Safely access discountAllocation.amount.amount, default to 0 if undefined
            return acc + (discountAllocation?.amount?.amount ?? 0);
          },
          0 // Initial value for the accumulator
        );

        return {
          item_id: "shopify_US_".concat(
            item?.variant?.product?.id,
            "_",
            item?.variant?.id
          ),
          item_name: item?.title,
          affiliation: item?.variant?.product?.vendor.concat(" Store"),
          sku: item?.variant?.sku,
          variant_id: item?.variant?.id,
          product_id: item?.variant?.product?.id,
          discount: totalItemDiscount,
          item_brand: item?.variant?.product?.vendor,
          item_category: item?.variant?.product?.type,
          item_variant: item?.variant?.title,
          price: item?.variant?.price?.amount - totalItemDiscount,
          quantity: item?.quantity,
        };
      }),
    },
    marketing: {
          user_id: event?.clientId,
          accepts_email_marketing: event?.data?.checkout?.buyerAcceptsEmailMarketing,
          accepts_sms_marketing: event?.data?.checkout?.buyerAcceptsSmsMarketing,
          user_email: event?.data?.checkout?.email,
          user_phone: event?.data?.checkout?.shippingAddress?.phone,
      },
    shipping_address: {
        address_1: event?.data?.checkout?.shippingAddress?.address1,
        address_2: event?.data?.checkout?.shippingAddress?.address2,
        city: event?.data?.checkout?.shippingAddress?.city,
        country: event?.data?.checkout?.shippingAddress?.country,
        country_code: event?.data?.checkout?.shippingAddress?.countryCode,
        first_name: event?.data?.checkout?.shippingAddress?.firstName,
        last_name: event?.data?.checkout?.shippingAddress?.lastName,
        phone: event?.data?.checkout?.shippingAddress?.phone,
        province: event?.data?.checkout?.shippingAddress?.province,
        province_code: event?.data?.checkout?.shippingAddress?.provinceCode,
        zip: event?.data?.checkout?.shippingAddress?.zip,
      },
    customer: {
        customer_id: customer?.id,
        customer_order_count: customer?.ordersCount,
        is_new_customer: customer?.ordersCount < 2,
      }
  };
  window.dataLayer.push(customerEventPayload);
  console.log(customerEventPayload);
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("product_added_to_cart", (event) => {
  if (!canAnalytics()) return;
  
  const data = event.data;
  const merchandise = data?.cartLine?.merchandise;
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "add_to_cart",
    ecommerce: {
      currency: data?.cartLine?.cost?.totalAmount?.currencyCode,
      value: data?.cartLine?.cost?.totalAmount?.amount,
      items: [{
        item_id: "shopify_US_".concat(
          merchandise?.product?.id,
          "_",
          merchandise?.id
        ),
        item_name: merchandise?.product?.title,
        affiliation: merchandise?.product?.vendor.concat(" Store"),
        item_brand: merchandise?.product?.vendor,
        item_category: merchandise?.product?.type,
        item_variant: merchandise?.title,
        price: merchandise?.price?.amount,
        quantity: data?.cartLine?.quantity,
      }],
    },
  };
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("product_removed_from_cart", (event) => {
  if (!canAnalytics()) return;
  
  const data = event.data;
  const merchandise = data?.cartLine?.merchandise;
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "remove_from_cart",
    ecommerce: {
      currency: data?.cartLine?.cost?.totalAmount?.currencyCode,
      value: data?.cartLine?.cost?.totalAmount?.amount ? data?.cartLine?.cost?.totalAmount?.amount / 100 : null,
      items: [{
        item_id: "shopify_US_".concat(
          merchandise?.product?.id,
          "_",
          merchandise?.id
        ),
        item_name: merchandise?.product?.title,
        affiliation: merchandise?.product?.vendor.concat(" Store"),
        item_brand: merchandise?.product?.vendor,
        item_category: merchandise?.product?.type,
        item_variant: merchandise?.title,
        price: merchandise?.price?.amount ? merchandise?.price?.amount / 100 : null,
        quantity: data?.cartLine?.quantity,
      }],
    },
  };
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("product_viewed", (event) => {
  if (!canAnalytics()) return;
  
  const data = event.data;
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "view_item",
    ecommerce: {
      currency: data?.productVariant?.price?.currencyCode,
      value: data?.productVariant?.price?.amount,
      items: [{
        item_id: "shopify_US_".concat(
          data?.productVariant?.product?.id,
          "_",
          data?.productVariant?.id
        ),
        item_name: data?.productVariant?.product?.title,
        affiliation: data?.productVariant?.product?.vendor.concat(" Store"),
        item_brand: data?.productVariant?.product?.vendor,
        item_category: data?.productVariant?.product?.type,
        item_variant: data?.productVariant?.title,
        price: data?.productVariant?.price?.amount,
      }],
    },
  };
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("cart_viewed", (event) => {
  if (!canAnalytics()) return;
  
  const cart = event?.data?.cart;
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: "view_cart",
    ecommerce: {
      currency: cart?.cost?.totalAmount?.currencyCode,
      value: cart?.cost?.totalAmount?.amount,
      items: cart?.lines.map((item) => {
        return {
          item_id: "shopify_US_".concat(
            item?.merchandise?.product?.id,
            "_",
            item?.merchandise?.id
          ),
          item_name: item?.merchandise?.product?.title,
          affiliation: item?.merchandise?.product?.vendor?.concat(" Store"),
          item_brand: item?.merchandise?.product?.vendor,
          item_category: item?.merchandise?.product?.type,
          price: item?.cost?.totalAmount?.amount,
          quantity: item?.quantity,
        };
      }),
    },
  };
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
});

analytics.subscribe("collection_viewed", (event) => {
  if (!canAnalytics()) return;
  
const collection = event?.data?.collection;
const ga4EventPayload = {
  event: "gtmEcommerceEvent",
  event_name: "view_item_list",
  ecommerce: {
    item_list_id: collection?.id,
    item_list_name: collection?.title,
    items: collection?.productVariants.map((item, index) => {
      return {
        item_id: "shopify_US_".concat(
          item?.product?.id,
          "_",
          item?.id
        ),
        item_name: item?.product?.title,
        affiliation: item?.product?.vendor?.concat(" Store"),
        item_brand: item?.product?.vendor,
        item_category: item?.product?.type,
        price: item?.price?.amount,
        item_variant: item?.title,
        index: index,
        item_list_id: collection?.id,
        item_list_name: collection?.title,
      };
    }),
  },
};
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push(ga4EventPayload);
console.log(ga4EventPayload);
});

// custom events

analytics.subscribe("gtmEvent", (event) => {
  if (!canAnalytics()) return;
  
  const eventPayload = {
    event: "gtmEvent",
    event_name: event?.customData?.event_name,
    footer_section: event?.customData?.footer_section,
    footer_link_text: event?.customData?.footer_link_text,
    navigation_asset_type: event?.customData?.navigation_asset_type,
    navigation_category: event?.customData?.navigation_category,
    navigation_element: event?.customData?.navigation_element,
    navigation_subcategory: event?.customData?.navigation_subcategory,
    email_signup_location: event?.customData?.email_signup_location,
    email_address: event?.customData?.email_address,
  };
  window.dataLayer.push(eventPayload);
  console.log(eventPayload);
});

analytics.subscribe("gtmEcommerceEvent", (event) => {
  if (!canAnalytics()) return;
  
  const data = event.customData;
  const ga4EventPayload = {
    event: "gtmEcommerceEvent",
    event_name: data?.event_name,
    ecommerce: {
      currency: data?.ecommerce?.currency,
      value: data?.ecommerce?.value,
      items: data?.ecommerce?.items.map((item) => {
        return {
          item_id: item?.item_id,
          item_name: item?.item_name,
          affiliation: item?.item_brand.concat(" Store"),
          item_brand: item?.item_brand,
          item_category: item?.item_category,
          price: item?.price,
          item_variant: item?.item_variant
        };
      }),
    },
  };
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(ga4EventPayload);
  console.log(ga4EventPayload);
  });