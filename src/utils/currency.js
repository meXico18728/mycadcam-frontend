export const EXCHANGE_RATE_USD_TO_UZS = 12500;

export const formatCurrency = (amountInUSD) => {
    if (amountInUSD == null) return '0 $ (0 UZS)';

    const amountInUZS = amountInUSD * EXCHANGE_RATE_USD_TO_UZS;

    const formattedUSD = amountInUSD.toLocaleString('en-US') + ' $';
    const formattedUZS = amountInUZS.toLocaleString('uz-UZ') + ' UZS';

    return `${formattedUSD} / ${formattedUZS}`;
};
