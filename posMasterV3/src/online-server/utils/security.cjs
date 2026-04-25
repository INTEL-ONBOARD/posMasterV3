const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function now() {
    return new Date();
}

function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
}

module.exports = {
    hashToken,
    now,
    publicUser
};
