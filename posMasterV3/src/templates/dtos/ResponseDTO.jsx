export default class ResponseDTO {
    // Declaring private fields
    #data;
    #message;
    #status;

    constructor({ status, message, data }) {
        this.#data = data;
        this.#message = message;
        this.#status = status;
    }

    // Getters
    get data() {
        return this.#data;
    }

    get message() {
        return this.#message;
    }

    get status() {
        return this.#status;
    }

    // Setters
    set data(value) {
        this.#data = value;
    }

    set message(value) {
        this.#message = value;
    }

    set status(value) {
        this.#status = value;
    }

    // For testing
    get showResponse() {
        return `${this.#data} (${this.#message}) (${this.#status})`;
    }

    toJSON() {
        return {
            data: this.#data,
            message: this.#message,
            status: this.#status,
        };
    }
}