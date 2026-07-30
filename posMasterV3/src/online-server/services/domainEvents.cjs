const { getDb } = require('../db/mongo.cjs');
const { emitDomainEvent } = require('../realtime/hub.cjs');
const { createLogger } = require('../utils/logger.cjs');

const logger = createLogger('DomainEvents');

async function publishDomainEvent(event) {
    const db = getDb();
    const domainEvent = {
        ...event,
        version: event.version || 1,
        changedAt: event.changedAt || new Date(),
        createdAt: new Date()
    };

    // Callers publish this after their own transaction (sale, restock, etc.)
    // has already committed — it's a best-effort audit/broadcast log, not
    // part of that transaction. A failure here must never surface as a
    // failure of the already-successful operation it's describing; that
    // would show the cashier a false error for a sale that actually went
    // through, risking a duplicate retry.
    try {
        await db.collection('domain_events').insertOne(domainEvent);
        emitDomainEvent(domainEvent);
    } catch (error) {
        logger.error(`Failed to publish domain event (non-fatal): ${event.event}`, { error: error.message });
    }

    return domainEvent;
}

module.exports = {
    publishDomainEvent
};
