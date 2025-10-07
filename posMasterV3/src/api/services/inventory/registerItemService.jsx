import ResponseDTO from "../../../templates/dtos/ResponseDTO";

import { apiClient } from "../../client";

class RegisterItemService {

    async getItems() {
        const response = await apiClient.get("api/itemRegistry/extended");
        return ResponseDTO(response.data);
        //return response.data.map((u) => new UserDTO(u));
    }

    async registerItem(item) {
        const response = await apiClient.post("api/itemRegistry/add", item);
        //return response;
        return new ResponseDTO(response.data);
    }

    async updateItem(itemId, item) {
        const response = await apiClient.put(`api/itemRegistry/${itemId}`, item);
        //return response;
        return new ResponseDTO(response.data);
    }

    async deleteItem(itemId) {
        const response = await apiClient.delete(`api/itemRegistry/${itemId}`);
        //return response;
        return new ResponseDTO(response.data);
    }

    // async getItemById(id) {
    //     const response = await apiClient.get(`api/itemRegistry/${id}`);
    //     return new UserDTO(response.data);
    // }

}

export default new RegisterItemService();