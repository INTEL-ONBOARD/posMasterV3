import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { restockApi, stockApi } from "../../localApi";

class RestockService {

    async getStockItems() {
        const response = await restockApi.getStockItems();
        return ResponseDTO(response);
    }

    async getStockData(sku) {
        const response = await restockApi.getStockData(sku);
        return ResponseDTO(response);
    }

    async createRestock(restockData) {
        const response = await restockApi.create(restockData);
        return new ResponseDTO(response);
    }

    async getRestocks(options = {}) {
        const response = await restockApi.getAll(options);
        return ResponseDTO(response);
    }

    async getRestockById(id) {
        const response = await restockApi.getById(id);
        return new ResponseDTO(response);
    }

    async getLowStock() {
        const response = await stockApi.getLowStock();
        return ResponseDTO(response);
    }

    async getExpiringStock(days = 30) {
        const response = await stockApi.getExpiring(days);
        return ResponseDTO(response);
    }

    async getStockValue() {
        const response = await stockApi.getValue();
        return new ResponseDTO(response);
    }

}

export default new RestockService();
