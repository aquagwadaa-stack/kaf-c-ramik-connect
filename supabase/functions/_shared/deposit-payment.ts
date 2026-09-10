export function getDepositPaymentLink(settings: { depositPaymentLink?: string }) {
  try {
    const url = new URL(settings.depositPaymentLink ?? "");
    if (
      url.origin !== "https://pay.sumup.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/b2c\/[A-Za-z0-9]+$/.test(url.pathname)
    )
      return "";
    return url.href;
  } catch {
    return "";
  }
}
