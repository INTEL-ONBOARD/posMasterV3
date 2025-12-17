export default class RegisterItemRequestDTO {
    // Attributes for the request
    stock_trace;
    item_name;
    item_image_url;
    sku;
    maximum_capacity;
    uom_id;
    category_id;
    inventory_id;
    availability;

    constructor({
        stock_trace,
        item_name,
        item_image_url,
        sku,
        maximum_capacity,
        uom_id,
        category_id,
        inventory_id,
        availability
    }) {
        this.stock_trace = stock_trace;
        this.item_name = item_name;
        this.item_image_url = item_image_url;
        this.sku = sku;
        this.maximum_capacity = maximum_capacity;
        this.uom_id = uom_id;
        this.category_id = category_id;
        this.inventory_id = inventory_id;
        this.availability = availability;
    }

    // Add toJSON method for serialization
    toJSON() {
        return {
            stock_trace: this.stock_trace,
            item_name: this.item_name,
            item_image_url: this.item_image_url,
            sku: this.sku,
            maximum_capacity: this.maximum_capacity,
            uom_id: this.uom_id,
            category_id: this.category_id,
            inventory_id: this.inventory_id,
            availability: this.availability
        };
    }
}