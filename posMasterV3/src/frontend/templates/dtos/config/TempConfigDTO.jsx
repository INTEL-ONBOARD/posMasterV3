export default class TempConfigDTO {
  // Necessary attributes for Temp Config
  version_no;
  config_path;
  created_date;
  updated_date;
  log = [
    {
      date_time: null,
      status: null,
      message: null,
      mode: null,
    },
  ];

  //   constructor to initialize the TempConfigDTO object
  constructor({ version_no, config_path, created_date, updated_date, log }) {
    this.version_no = version_no;
    this.config_path = config_path;
    this.created_date = created_date;
    this.updated_date = updated_date;
    this.log = log;
  }
  // Optional: Add toJSON method for serialization
  toJSON() {
    return {
      version_no: this.version_no,
      config_path: this.config_path,
      created_date: this.created_date,
      updated_date: this.updated_date,
      log: this.log,
    };
  }
}
