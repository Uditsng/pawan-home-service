/**
 * Fee and Wallet Allocator
 *
 * Implements the authoritative multi-service cart fee and wallet allocation:
 * 1. Allocates order fees across cart lines paisa-exact using the largest remainder method.
 * 2. Allocates wallet credit first to services, then to fees.
 * 3. Enforces the invariant:
 *    sum(bookings.total_amount) === orders.final_amount
 *    bookings.total_amount = final_price = booking_pricing.total_price (fee-inclusive)
 */

export interface LineAllocationInput {
  serviceId: string;
  /** Service total after coupon and offer discounts, before wallet discount */
  serviceTotal: number;
}

export interface AllocatedLine {
  serviceId: string;
  grossService: number;
  walletServiceDiscount: number;
  netService: number;
  grossFee: number;
  walletFeeDiscount: number;
  netFee: number;
  /** Authoritative fee-inclusive total for this booking */
  lineTotal: number;
  totalWalletDiscount: number;
}

export interface AllocationResult {
  lines: AllocatedLine[];
  orderFeesTotal: number;
  walletAppliedTotal: number;
  finalOrderAmount: number;
}

/**
 * Distributes an integer number of paise across weights using the largest-remainder method.
 */
function distributePaise(
  weights: { key: string; weight: number }[],
  totalPaise: number
): Record<string, number> {
  const result: Record<string, number> = {};
  if (totalPaise <= 0 || weights.length === 0) {
    for (const w of weights) result[w.key] = 0;
    return result;
  }

  const weightSum = weights.reduce((sum, w) => sum + w.weight, 0);
  if (weightSum <= 0) {
    // Equal distribution if weights are 0
    const baseShare = Math.floor(totalPaise / weights.length);
    let rem = totalPaise % weights.length;
    for (const w of weights) {
      result[w.key] = baseShare + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
    }
    return result;
  }

  const shares = weights.map((w) => ({
    key: w.key,
    base: Math.floor((w.weight * totalPaise) / weightSum),
    remainder: (w.weight * totalPaise) % weightSum,
  }));

  const totalBase = shares.reduce((sum, s) => sum + s.base, 0);
  let leftover = totalPaise - totalBase;

  shares.sort((a, b) => b.remainder - a.remainder);
  for (const s of shares) {
    if (leftover <= 0) break;
    s.base += 1;
    leftover -= 1;
  }

  for (const s of shares) {
    result[s.key] = s.base;
  }
  return result;
}

export function allocateOrderFeesAndWallet(
  items: LineAllocationInput[],
  orderFeesAmount: number,
  walletAmountToUse: number
): AllocationResult {
  const cleanOrderFees = Math.max(0, Math.round(Number(orderFeesAmount || 0) * 100) / 100);
  const cleanWallet = Math.max(0, Math.round(Number(walletAmountToUse || 0) * 100) / 100);

  const linesWithWeights = items.map((item) => ({
    key: item.serviceId,
    weight: Math.max(0, Math.round(Number(item.serviceTotal || 0) * 100)),
  }));

  const serviceTotalPaise = linesWithWeights.reduce((sum, l) => sum + l.weight, 0);
  const orderFeesPaise = Math.round(cleanOrderFees * 100);
  const walletPaise = Math.round(cleanWallet * 100);

  // 1. Gross order fee allocation across cart lines
  const grossFeePaiseByLine = distributePaise(linesWithWeights, orderFeesPaise);

  // 2. Allocate wallet first to services, then to order fees
  const walletToServicePaise = Math.min(walletPaise, serviceTotalPaise);
  const walletToFeesPaise = Math.min(walletPaise - walletToServicePaise, orderFeesPaise);

  const walletServicePaiseByLine = distributePaise(linesWithWeights, walletToServicePaise);

  // Fee wallet distribution proportional to each line's fee share
  const feeWeights = items.map((item) => ({
    key: item.serviceId,
    weight: grossFeePaiseByLine[item.serviceId] || 0,
  }));
  const walletFeePaiseByLine = distributePaise(feeWeights, walletToFeesPaise);

  const allocatedLines: AllocatedLine[] = items.map((item) => {
    const grossServicePaise = Math.max(0, Math.round(Number(item.serviceTotal || 0) * 100));
    const walletServPaise = walletServicePaiseByLine[item.serviceId] || 0;
    const netServicePaise = grossServicePaise - walletServPaise;

    const grossFeePaise = grossFeePaiseByLine[item.serviceId] || 0;
    const walletFeeP = walletFeePaiseByLine[item.serviceId] || 0;
    const netFeePaise = grossFeePaise - walletFeeP;

    const lineTotalPaise = netServicePaise + netFeePaise;
    const totalWalletPaise = walletServPaise + walletFeeP;

    return {
      serviceId: item.serviceId,
      grossService: grossServicePaise / 100,
      walletServiceDiscount: walletServPaise / 100,
      netService: netServicePaise / 100,
      grossFee: grossFeePaise / 100,
      walletFeeDiscount: walletFeeP / 100,
      netFee: netFeePaise / 100,
      lineTotal: lineTotalPaise / 100,
      totalWalletDiscount: totalWalletPaise / 100,
    };
  });

  const finalOrderAmountPaise = serviceTotalPaise + orderFeesPaise - (walletToServicePaise + walletToFeesPaise);

  return {
    lines: allocatedLines,
    orderFeesTotal: cleanOrderFees,
    walletAppliedTotal: (walletToServicePaise + walletToFeesPaise) / 100,
    finalOrderAmount: finalOrderAmountPaise / 100,
  };
}
