import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { memberApi } from "../../localApi";

class MemberService {

    async getMembers() {
        const response = await memberApi.getAll();
        return ResponseDTO(response);
    }

    async getActiveMembers() {
        const response = await memberApi.getActive();
        return ResponseDTO(response);
    }

    async getMemberById(id) {
        const response = await memberApi.getById(id);
        return new ResponseDTO(response);
    }

    async getMemberByMemberNo(memberNo) {
        const response = await memberApi.getByMemberNo(memberNo);
        return new ResponseDTO(response);
    }

    async createMember(memberData) {
        const response = await memberApi.create(memberData);
        return new ResponseDTO(response);
    }

    async updateMember(id, memberData) {
        const response = await memberApi.update(id, memberData);
        return new ResponseDTO(response);
    }

    async deleteMember(id) {
        const response = await memberApi.delete(id);
        return new ResponseDTO(response);
    }

    async searchMembers(searchTerm) {
        const response = await memberApi.search(searchTerm);
        return ResponseDTO(response);
    }

    async getMemberWithTransactions(id) {
        const api = window.electronAPI;
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        const response = await api.members.getWithTransactions(id);
        return new ResponseDTO(response);
    }

    async getTopMembers(limit = 10) {
        const api = window.electronAPI;
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        const response = await api.members.getTop(limit);
        return ResponseDTO(response);
    }

    async getDebtors() {
        const api = window.electronAPI;
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        const response = await api.members.getDebtors();
        return ResponseDTO(response);
    }

}

export default new MemberService();
