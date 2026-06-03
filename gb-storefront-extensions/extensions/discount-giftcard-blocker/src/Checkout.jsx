import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useComputed} from '@preact/signals';
import {useEffect} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

// Shopify's built-in product type for gift card products.
const GIFT_CARD_PRODUCT_TYPE = 'Gift Cards';

const BLOCKED_HEADING = "You can not add coupon for the Gift Card.";
const BLOCKED_MESSAGE =
  "Discount codes can't be applied to orders that contain a gift card. Please remove the discount code or the gift card from your cart to continue.";

function Extension() {
  console.log(shopify.discountCodes.value);

  const hasGiftCardInCart = useComputed(() =>
    shopify.lines.value.some(
      (line) => line.merchandise?.product?.productType === GIFT_CARD_PRODUCT_TYPE,
    ),
  );

  const hasDiscountCode = useComputed(
    () => shopify.discountCodes.value.length > 0,
  );

  const isBlocked = useComputed(
    () => hasGiftCardInCart.value && hasDiscountCode.value,
  );

  // Register a buyer-journey interceptor that blocks the buyer from
  // progressing through checkout while the offending combination exists.
  // `intercept` resolves to an unsubscribe function, so we await it inside
  // the effect and call it during cleanup.
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    shopify.buyerJourney
      .intercept(() => {
        if (!isBlocked.value) {
          return {behavior: 'allow'};
        }

        return {
          behavior: 'block',
          reason: 'Discount codes cannot be applied to gift card purchases.',
          errors: [
            {
              message: BLOCKED_MESSAGE,
            },
          ],
        };
      })
      .then((remove) => {
        if (cancelled) {
          remove();
        } else {
          unsubscribe = remove;
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!isBlocked.value) {
    return null;
  }

  return (
    <s-banner heading={BLOCKED_HEADING} tone="critical">
      {BLOCKED_MESSAGE}
    </s-banner>
  );
}
