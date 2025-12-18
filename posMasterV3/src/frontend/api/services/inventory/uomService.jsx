import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { uomApi } from "../../localApi";

class UomService {

    async getUoms() {
        const response = await uomApi.getAll();
        return ResponseDTO(response);
    }

    async createUom(uom) {
        const response = await uomApi.create(uom);
        return new ResponseDTO(response);
    }

    async updateUom(uomId, uom) {
        const response = await uomApi.update(uomId, uom);
        return new ResponseDTO(response);
    }

    async deleteUom(uomId) {
        const response = await uomApi.delete(uomId);
        return new ResponseDTO(response);
    }

}

export default new UomService();
