type ConnectEvent = {
    title: string;
    description: string;
    location: string;
    notes: string;
    dateTime: Date;
  };
  
  class ConnectEventClass {
    title: string;
    description: string;
    location: string;
    notes: string;
    dateTime: Date;
  
    constructor(
      title: string,
      description: string,
      location: string,
      notes: string,
      dateTime: Date
    ) {
      this.title = title;
      this.description = description;
      this.location = location;
      this.notes = notes;
      this.dateTime = dateTime;
    }
  
    getTitle(): string {
      return this.title;
    }
  
    getDescription(): string {
      return this.description;
    }
  
    getLocation(): string {
      return this.location;
    }
  
    getNotes(): string {
      return this.notes;
    }
  
    getDateTime(): Date {
      return this.dateTime;
    }
  }
  
  export default ConnectEventClass;
  