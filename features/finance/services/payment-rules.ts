export function isPaymentAmountValid(amountMinor: number, outstandingMinor: number) { return Number.isInteger(amountMinor) && amountMinor > 0 && amountMinor <= outstandingMinor; }
