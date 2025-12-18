import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { itemApi } from "../../localApi";

class RegisterItemService {

    async getItems() {
        const response = await itemApi.getAllExtended();
        return ResponseDTO(response);
    }

    async registerItem(item) {
        const response = await itemApi.create(item);
        return new ResponseDTO(response);
    }

    async updateItem(itemId, item) {
        const response = await itemApi.update(itemId, item);
        return new ResponseDTO(response);
    }

    async deleteItem(itemId) {
        const response = await itemApi.delete(itemId);
        return new ResponseDTO(response);
    }

    async getItemBySku(sku) {
        const response = await itemApi.getBySku(sku);
        return new ResponseDTO(response);
    }

    async searchItems(searchTerm) {
        const response = await itemApi.search(searchTerm);
        return ResponseDTO(response);
    }

}

export default new RegisterItemService();
