import ResponseDTO from "../../../templates/dtos/ResponseDTO";

import { apiClient } from "../../client";

class BranchService {

    async getBranches() {
        const response = await apiClient.get("api/inventories");
        return ResponseDTO(response.data);
        //return response.data.map((u) => new UserDTO(u));
    }

    async registerBranch(branch) {
        const response = await apiClient.post("api/inventories/add", branch);
        //return response;
        return new ResponseDTO(response.data);
    }

    async updateBranch(branchId, branch) {
        const response = await apiClient.put(`api/inventories/${branchId}`, branch);
        //return response;
        return new ResponseDTO(response.data);
    }

    async deleteDranch(branchId) {
        const response = await apiClient.delete(`api/inventories/${branchId}`);
        //return response;
        return new ResponseDTO(response.data);
    }

    // async getbranchById(id) {
    //     const response = await apiClient.get(`api/branchRegistry/${id}`);
    //     return new UserDTO(response.data);
    // }

}

export default new BranchService();