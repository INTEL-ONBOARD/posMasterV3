function getOnlineApi() {
  if (!window.electronAPI?.online) {
    throw new Error('Online API is not available');
  }
  return window.electronAPI.online;
}

export const onlineApi = {
  getConfig() {
    return getOnlineApi().getConfig();
  },

  health() {
    return getOnlineApi().health();
  },

  ready() {
    return getOnlineApi().ready();
  },

  login(email, password, deviceInfo = null) {
    return getOnlineApi().login(email, password, deviceInfo);
  },

  register(userData) {
    return getOnlineApi().register(userData);
  },

  logout() {
    return getOnlineApi().logout();
  },

  validateSession() {
    return getOnlineApi().validateSession();
  },

  getRealtimeStatus() {
    return getOnlineApi().getRealtimeStatus();
  },

  list(collection, query = {}) {
    return getOnlineApi().list(collection, query);
  },

  get(collection, id) {
    return getOnlineApi().get(collection, id);
  },

  create(collection, data) {
    return getOnlineApi().create(collection, data);
  },

  update(collection, id, data) {
    return getOnlineApi().update(collection, id, data);
  },

  delete(collection, id) {
    return getOnlineApi().delete(collection, id);
  },

  createSale(data) {
    return getOnlineApi().createSale(data);
  },

  generateInvoiceNo(type = 'SALE') {
    return getOnlineApi().generateInvoiceNo(type);
  },

  onRealtimeStatus(callback) {
    return getOnlineApi().onRealtimeStatus(callback);
  },

  onDomainEvent(callback) {
    return getOnlineApi().onDomainEvent(callback);
  },

  onEvent(callback) {
    return getOnlineApi().onEvent(callback);
  }
};

export default onlineApi;
