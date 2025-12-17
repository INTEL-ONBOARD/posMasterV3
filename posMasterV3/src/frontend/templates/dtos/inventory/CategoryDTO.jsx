export default class CategoryDTO {
    // Necessary attributes for passing
    id;
    brand;
    type;

    constructor({ id, brand, type }) {
        this.id = id;
        this.brand = brand;
        this.type = type;
    }

    // Optional: Add toJSON method for serialization
    toJSON() {
        return {
            id: this.id,
            brand: this.brand,
            type: this.type,
        };
    }
}