import apiClient from "./apiClient";
import UserDTO from "../../../templates/dtos/user/UserDTO";

class ApiService {

    async getUsers() {
        const response = await apiClient.get("/users");
        return response.data.map((u) => new UserDTO(u));
    }

    async getUserById(id) {
        const response = await apiClient.get(`/users/${id}`);
        return new UserDTO(response.data);
    }

    async createUser(user) {
        const response = await apiClient.post("/users", user);
        return new UserDTO(response.data);
    }
}

export default new ApiService();
