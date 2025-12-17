import UomDTO from './UomDTo';
import CategoryDTO from './CategoryDTO';

export default class RegisterItemDTO {
    // Necessary attributes for passing
    id;
    item_update_datetime;
    item_created_datetime;
    stock_trace;
    item_name;
    item_image_url;
    sku;
    maximum_capacity;
    uom_id;
    category_id;
    inventory_id;
    availability;
    uom;
    category;
    inventory;

    constructor({
        id,
        item_update_datetime,
        item_created_datetime,
        stock_trace,
        item_name,
        item_image_url,
        sku,
        maximum_capacity,
        uom_id,
        category_id,
        inventory_id,
        availability,
        uom,
        category,
        inventory
    }) {
        this.id = id;
        this.item_update_datetime = item_update_datetime;
        this.item_created_datetime = item_created_datetime;
        this.stock_trace = stock_trace;
        this.item_name = item_name;
        this.item_image_url = item_image_url;
        this.sku = sku;
        this.maximum_capacity = maximum_capacity;
        this.uom_id = uom_id;
        this.category_id = category_id;
        this.inventory_id = inventory_id;
        this.availability = availability;
        this.uom = uom ? new UomDTO(uom) : null;
        this.category = category ? new CategoryDTO(category) : null;
        this.inventory = inventory;
    }

    // Optional: Add toJSON method for serialization
    toJSON() {
        return {
            id: this.id,
            item_update_datetime: this.item_update_datetime,
            item_created_datetime: this.item_created_datetime,
            stock_trace: this.stock_trace,
            item_name: this.item_name,
            item_image_url: this.item_image_url,
            sku: this.sku,
            maximum_capacity: this.maximum_capacity,
            uom_id: this.uom_id,
            category_id: this.category_id,
            inventory_id: this.inventory_id,
            availability: this.availability,
            uom: this.uom ? this.uom.toJSON() : null,
            category: this.category ? this.category.toJSON() : null,
            inventory: this.inventory
        };
    }
}