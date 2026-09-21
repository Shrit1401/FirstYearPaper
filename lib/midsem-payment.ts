/** Only a receipt tied to our recorded checkout can grant midsem access. */
export function matchesMidsemPayment(
  checkout: {userId:string;scope?:string;productId?:string}|null|undefined,
  receipt: {userId:string;amount?:number;currency?:string},
  configuredProductId:string|undefined,
) {
  return !!checkout && !!configuredProductId && checkout.userId===receipt.userId &&
    checkout.scope==='midsem' && checkout.productId===configuredProductId &&
    receipt.amount===2900 && receipt.currency==='INR';
}
