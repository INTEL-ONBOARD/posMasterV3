import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { supplierApi } from "../../localApi";

class SupplierService {

    async getSuppliers() {
        const response = await supplierApi.getAll();
        return ResponseDTO(response);
    }

    async createSupplier(supplier) {
        const response = await supplierApi.create(supplier);
        return new ResponseDTO(response);
    }

    async updatesupplier(supplierId, supplier) {
        const response = await supplierApi.update(supplierId, supplier);
        return new ResponseDTO(response);
    }

    async deletesupplier(supplierId) {
        const response = await supplierApi.delete(supplierId);
        return new ResponseDTO(response);
    }

    async searchSuppliers(searchTerm) {
        const response = await supplierApi.search(searchTerm);
        return ResponseDTO(response);
    }

}

export default new SupplierService();
