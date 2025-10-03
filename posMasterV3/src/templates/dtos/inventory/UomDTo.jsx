export default class UomDTO {
    // Necessary attributes for passing
    id;
    symbol;
    unit_name;

    constructor({ id, symbol, unit_name }) {
        this.id = id;
        this.symbol = symbol;
        this.unit_name = unit_name;
    }

    // Optional: Add toJSON method for serialization
    toJSON() {
        return {
            id: this.id,
            symbol: this.symbol,
            unit_name: this.unit_name,
        };
    }
}