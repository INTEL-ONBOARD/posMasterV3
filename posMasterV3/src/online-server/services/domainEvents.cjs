const { getDb } = require('../db/mongo.cjs');
const { emitDomainEvent } = require('../realtime/hub.cjs');

async function publishDomainEvent(event) {
    const db = getDb();
    const domainEvent = {
        ...event,
        version: event.version || 1,
        changedAt: event.changedAt || new Date(),
        createdAt: new Date()
    };

    await db.collection('domain_events').insertOne(domainEvent);
    emitDomainEvent(domainEvent);
    return domainEvent;
}

module.exports = {
    publishDomainEvent
};
