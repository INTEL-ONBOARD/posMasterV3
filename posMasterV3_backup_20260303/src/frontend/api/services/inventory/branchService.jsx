import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { branchApi } from "../../localApi";

class BranchService {

    async getBranches() {
        const response = await branchApi.getAll();
        return ResponseDTO(response);
    }

    async registerBranch(branch) {
        const response = await branchApi.create(branch);
        return new ResponseDTO(response);
    }

    async updateBranch(branchId, branch) {
        const response = await branchApi.update(branchId, branch);
        return new ResponseDTO(response);
    }

    async deleteDranch(branchId) {
        const response = await branchApi.delete(branchId);
        return new ResponseDTO(response);
    }

}

export default new BranchService();
