export default class ResponseDTO {
<<<<<<< HEAD
    // Declaring private fields as private
    #data;
    #message;
    #status;

    constructor({ status, message, data }) {
        this.#data = data;
        this.#message = message;
        this.#status = status;
=======
    // Declaring fields as public
    data;
    message;
    status;

    constructor({ status, message, data }) {
        this.data = data;
        this.message = message;
        this.status = status;
>>>>>>> bf562e173213cfdbd85e43de8cfb9ac98fa784e0
    }

    // Getters
    get data() {
<<<<<<< HEAD
        return this.#data;
    }

    get message() {
        return this.#message;
    }

    get status() {
        return this.#status;
=======
        return this.data;
    }

    get message() {
        return this.message;
    }

    get status() {
        return this.status;
>>>>>>> bf562e173213cfdbd85e43de8cfb9ac98fa784e0
    }

    // Setters
    set data(value) {
<<<<<<< HEAD
        this.#data = value;
    }

    set message(value) {
        this.#message = value;
    }

    set status(value) {
        this.#status = value;
=======
        this.data = value;
    }

    set message(value) {
        this.message = value;
    }

    set status(value) {
        this.status = value;
>>>>>>> bf562e173213cfdbd85e43de8cfb9ac98fa784e0
    }

    // For testing
    get showResponse() {
<<<<<<< HEAD
        return `${this.#data} (${this.#message}) (${this.#status})`;
=======
        return `${this.data} (${this.message}) (${this.status})`;
>>>>>>> bf562e173213cfdbd85e43de8cfb9ac98fa784e0
    }

    toJSON() {
        return {
<<<<<<< HEAD
            data: this.#data,
            message: this.#message,
            status: this.#status,
=======
            data: this.data,
            message: this.message,
            status: this.status,
>>>>>>> bf562e173213cfdbd85e43de8cfb9ac98fa784e0
        };
    }
}