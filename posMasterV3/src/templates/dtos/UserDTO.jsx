export default class UserDTO {
    
    constructor({ id, username, email, role, isActive }) {
        this._id = id;
        this._username = username;
        this._email = email;
        this._role = role;
        this._isActive = isActive;
    }

    get id() {
        return this._id;
    }

    get username() {
        return this._username;
    }

    get email() {
        return this._email;
    }

    get role() {
        return this._role;
    }

    get isActive() {
        return this._isActive;
    }

    set id(value) {
        this._id = value;
    }

    set username(value) {
        this._username = value;
    }

    set email(value) {
        this._email = value;
    }

    set role(value) {
        this._role = value;
    }

    set isActive(value) {
        this._isActive = value;
    }

    get displayName() {
        return `${this._username} (${this._email})`;
    }

    toJSON() {
        return {
            id: this._id,
            username: this._username,
            email: this._email,
            role: this._role,
            isActive: this._isActive,
        };
    }
}
