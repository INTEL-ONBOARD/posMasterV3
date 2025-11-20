import ResponseDTO from "../../../templates/dtos/ResponseDTO";

import { apiClient } from "../../client";

class SupplierService {

    async getSuppliers() {
        const response = await apiClient.get("api/suppliers");
        return ResponseDTO(response.data);
        //return response.data.map((u) => new UserDTO(u));
    }

    async createSupplier(supplier) {
        const response = await apiClient.post("api/suppliers/add", supplier);
        //return response;
        return new ResponseDTO(response.data);
    }

    async updatesupplier(supplierId, supplier) {
        const response = await apiClient.put(`api/suppliers/${supplierId}`, supplier);
        //return response;
        return new ResponseDTO(response.data);
    }

    async deletesupplier(supplierId) {
        const response = await apiClient.delete(`api/suppliers/${supplierId}`);
        //return response;
        return new ResponseDTO(response.data);
    }

    // async getsupplierById(id) {
    //     const response = await apiClient.get(`api/supplierRegistry/${id}`);
    //     return new UserDTO(response.data);
    // }

}

export default new SupplierService();