export const normalizeUomSymbol = (symbol = "") => String(symbol || "").trim().toLowerCase();

export const isKgUom = (symbol = "") => normalizeUomSymbol(symbol) === "kg";

export const isLiterUom = (symbol = "") => normalizeUomSymbol(symbol) === "l";

export const supportsDecimalSaleQuantity = (symbol = "") =>
  isKgUom(symbol) || isLiterUom(symbol);

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getEffectiveSellingPrice = (record = {}) => {
  const uomSymbol = normalizeUomSymbol(record?.uom?.symbol ?? record?.uom_symbol ?? record?.uomSymbol);

  if (isKgUom(uomSymbol)) {
    return toNumber(
      record?.selling_price_per_kg ??
      record?.sellingPricePerKg ??
      record?.unit_price ??
      record?.unitPrice ??
      record?.retail_price ??
      record?.retailPrice
    );
  }

  if (isLiterUom(uomSymbol)) {
    return toNumber(
      record?.selling_price_per_liter ??
      record?.sellingPricePerLiter ??
      record?.unit_price ??
      record?.unitPrice ??
      record?.retail_price ??
      record?.retailPrice
    );
  }

  return toNumber(
    record?.unit_price ??
    record?.unitPrice ??
    record?.retail_price ??
    record?.retailPrice
  );
};
