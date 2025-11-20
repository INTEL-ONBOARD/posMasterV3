export default class UserDTO {
    // Necessary attributes for passing
    _id;
    username;
    email;
    full_name;
    roles;
    password;

    constructor({ _id, username, email, full_name, roles, password }) {
        this._id = _id;
        this.username = username;
        this.email = email;
        this.full_name = full_name;
        this.roles = roles;
        this.password = password;
    }

    // Optional: Add toJSON method for serialization
    toJSON() {
        return {
            _id: this._id,
            username: this.username,
            email: this.email,
            full_name: this.full_name,
            roles: this.roles,
            password: this.password,
        };
    }
}