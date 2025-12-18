import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { salesApi } from "../../localApi";

class SalesService {

    async getSales(options = {}) {
        const response = await salesApi.getAll(options);
        return ResponseDTO(response);
    }

    async getSaleById(id) {
        const response = await salesApi.getById(id);
        return new ResponseDTO(response);
    }

    async getSaleByInvoice(invoiceNo) {
        const response = await salesApi.getByInvoice(invoiceNo);
        return new ResponseDTO(response);
    }

    async createSale(saleData) {
        const response = await salesApi.create(saleData);
        return new ResponseDTO(response);
    }

    async holdOrder(orderData) {
        const response = await salesApi.hold(orderData);
        return new ResponseDTO(response);
    }

    async getHeldOrders() {
        const response = await salesApi.getHeldOrders();
        return ResponseDTO(response);
    }

    async completeHeldOrder(id, updateData = {}) {
        const response = await salesApi.completeHeld(id, updateData);
        return new ResponseDTO(response);
    }

    async cancelSale(id) {
        const response = await salesApi.cancel(id);
        return new ResponseDTO(response);
    }

    async generateInvoiceNo() {
        const response = await salesApi.generateInvoiceNo();
        return new ResponseDTO(response);
    }

    async getSalesSummary(startDate, endDate) {
        const response = await salesApi.getSummary(startDate, endDate);
        return new ResponseDTO(response);
    }

    async getDailySales(days = 30) {
        const response = await salesApi.getDaily(days);
        return ResponseDTO(response);
    }

    async getSalesByMember(memberId) {
        const response = await salesApi.getByMember(memberId);
        return ResponseDTO(response);
    }

    async getSalesByDateRange(startDate, endDate) {
        const response = await salesApi.getByDateRange(startDate, endDate);
        return ResponseDTO(response);
    }

}

export default new SalesService();
