import UserDTO from "../../../templates/dtos/user/UserDTO";
import { userApi, authApi } from "../../localApi";

class ApiService {

    async getUsers() {
        const response = await userApi.getAll();
        if (response.status === 'success' && response.data) {
            return response.data.map((u) => new UserDTO(u));
        }
        return [];
    }

    async getUserById(id) {
        const response = await userApi.getById(id);
        if (response.status === 'success' && response.data) {
            return new UserDTO(response.data);
        }
        return null;
    }

    async createUser(user) {
        const response = await authApi.register(user);
        if (response.status === 'success' && response.data) {
            return new UserDTO(response.data);
        }
        return null;
    }

    async updateUser(id, userData) {
        const response = await userApi.update(id, userData);
        if (response.status === 'success' && response.data) {
            return new UserDTO(response.data);
        }
        return null;
    }

    async deleteUser(id) {
        const response = await userApi.delete(id);
        return response;
    }

    async searchUsers(query) {
        const response = await userApi.search(query);
        if (response.status === 'success' && response.data) {
            return response.data.map((u) => new UserDTO(u));
        }
        return [];
    }

}

export default new ApiService();
