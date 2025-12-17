import ResponseDTO from "../../../templates/dtos/ResponseDTO";

import { apiClient } from "../../client";

class CategoryService {

    async getCategories() {
        const response = await apiClient.get("api/categories");
        return ResponseDTO(response.data);
        //return response.data.map((u) => new UserDTO(u));
    }

    async createCategory(category) {
        const response = await apiClient.post("api/categories/add", category);
        //return response;
        return new ResponseDTO(response.data);
    }

    async updateCategory(categoryId, category) {
        const response = await apiClient.put(`api/categories/${categoryId}`, category);
        //return response;
        return new ResponseDTO(response.data);
    }

    async deleteCategory(categoryId) {
        const response = await apiClient.delete(`api/categories/${categoryId}`);
        //return response;
        return new ResponseDTO(response.data);
    }

    // async getcategoryById(id) {
    //     const response = await apiClient.get(`api/categoryRegistry/${id}`);
    //     return new UserDTO(response.data);
    // }

}

export default new CategoryService();