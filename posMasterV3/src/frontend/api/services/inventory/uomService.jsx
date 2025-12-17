import ResponseDTO from "../../../templates/dtos/ResponseDTO";

import { apiClient } from "../../client";

class UomService {

    async getUoms() {
        const response = await apiClient.get("api/uoms");
        return ResponseDTO(response.data);
        //return response.data.map((u) => new UserDTO(u));
    }

    async createUom(uom) {
        const response = await apiClient.post("api/uoms/add", uom);
        //return response;
        return new ResponseDTO(response.data);
    }

    async updateUom(uomId, uom) {
        const response = await apiClient.put(`api/uoms/${uomId}`, uom);
        //return response;
        return new ResponseDTO(response.data);
    }

    async deleteUom(uomId) {
        const response = await apiClient.delete(`api/uoms/${uomId}`);
        //return response;
        return new ResponseDTO(response.data);
    }

    // async getuomById(id) {
    //     const response = await apiClient.get(`api/uomRegistry/${id}`);
    //     return new UserDTO(response.data);
    // }

}

export default new UomService();