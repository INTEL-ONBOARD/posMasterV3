function normalizeUomSymbol(symbol = '') {
    return String(symbol || '').trim().toLowerCase();
}

function isKgUom(symbol = '') {
    return normalizeUomSymbol(symbol) === 'kg';
}

function isLiterUom(symbol = '') {
    return normalizeUomSymbol(symbol) === 'l';
}

function toNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getEffectiveSellingPrice(record = {}, uomSymbol = '') {
    const normalizedSymbol = normalizeUomSymbol(
        uomSymbol || record?.uom_symbol || record?.uomSymbol || record?.uom?.symbol
    );

    if (isKgUom(normalizedSymbol)) {
        return toNumber(
            record?.selling_price_per_kg ??
            record?.sellingPricePerKg ??
            record?.unit_price ??
            record?.unitPrice ??
            record?.retail_price ??
            record?.retailPrice
        );
    }

    if (isLiterUom(normalizedSymbol)) {
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
}

module.exports = {
    normalizeUomSymbol,
    isKgUom,
    isLiterUom,
    getEffectiveSellingPrice
};
