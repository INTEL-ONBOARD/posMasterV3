export default class ConfigFileDTO {
  // Nescessary attributes for Config File
  automatic_logout;
  notifications;
  cloud_sync;
  temp_system;
  run_on_startup;
  maximize_window;
  temp_file_path;
  config_file_path;
  db_config_path;
  outlet_setup;
  created_date;
  updated_date;

  //   constructor to initialize the ConfigFileDTO object
  constructor({
    automatic_logout,
    notifications,
    cloud_sync,
    temp_system,
    run_on_startup,
    maximize_window,
    temp_file_path,
    config_file_path,
    db_config_path,
    outlet_setup,
    created_date,
    updated_date,
  }) {
    this.automatic_logout = automatic_logout;
    this.notifications = notifications;
    this.cloud_sync = cloud_sync;
    this.temp_system = temp_system;
    this.run_on_startup = run_on_startup;
    this.maximize_window = maximize_window;
    this.temp_file_path = temp_file_path;
    this.config_file_path = config_file_path;
    this.db_config_path = db_config_path;
    this.outlet_setup = outlet_setup;
    this.created_date = created_date;
    this.updated_date = updated_date;
  }

  // Optional: Add toJSON method for serialization
  toJSON() {
    return {
      automatic_logout: this.automatic_logout,
      notifications: this.notifications,
      cloud_sync: this.cloud_sync,
      temp_system: this.temp_system,
      run_on_startup: this.run_on_startup,
      maximize_window: this.maximize_window,
      temp_file_path: this.temp_file_path,
      config_file_path: this.config_file_path,
      db_config_path: this.db_config_path,
      outlet_setup: this.outlet_setup,
      created_date: this.created_date,
      updated_date: this.updated_date,
    };
  }
}
