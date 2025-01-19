type ConnectEvent = {
    title: string;
    description: string;
    location: string;
    notes: string;
   
  };
  
  class ConnectEventClass {
    title: string;
    description: string;
    location: string;
    notes: string;
   
  
    constructor(
      title: string,
      description: string,
      location: string,
      notes: string,
      
    ) {
      this.title = title;
      this.description = description;
      this.location = location;
      this.notes = notes;
      
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
  
   
  }
  
  export default ConnectEventClass;
  