import ResponseDTO from "../../../templates/dtos/ResponseDTO";
import { categoryApi } from "../../localApi";

class CategoryService {

    async getCategories() {
        const response = await categoryApi.getAll();
        return ResponseDTO(response);
    }

    async createCategory(category) {
        const response = await categoryApi.create(category);
        return new ResponseDTO(response);
    }

    async updateCategory(categoryId, category) {
        const response = await categoryApi.update(categoryId, category);
        return new ResponseDTO(response);
    }

    async deleteCategory(categoryId) {
        const response = await categoryApi.delete(categoryId);
        return new ResponseDTO(response);
    }

    async searchCategories(searchTerm) {
        const response = await categoryApi.search(searchTerm);
        return ResponseDTO(response);
    }

}

export default new CategoryService();
