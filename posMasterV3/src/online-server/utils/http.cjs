function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function ok(res, data = null, message = null) {
    const body = { status: 'success', data };
    if (message) body.message = message;
    return res.json(body);
}

function fail(res, statusCode, message, code = null) {
    const body = { status: 'error', message };
    if (code) body.code = code;
    return res.status(statusCode).json(body);
}

function errorMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);
    const statusCode = error.statusCode || error.status || 500;
    const message = statusCode >= 500 && !error.code ? 'Internal server error' : error.message;
    if (statusCode >= 500 && !error.code) {
        console.error('[OnlineAPI] Unhandled error:', error);
    }
    return fail(res, statusCode, message, error.code);
}

module.exports = {
    asyncHandler,
    ok,
    fail,
    errorMiddleware
};
