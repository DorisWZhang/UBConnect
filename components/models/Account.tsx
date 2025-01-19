type AccountProps = {
    email: string;
    faculty: string;
    major: string;
    name: string;
    nameId: string;
    password: string;
    year: string;
    friends: string[];
    interests: string[];
  };
  
  class Account {
    email: string;
    faculty: string;
    major: string;
    name: string;
    nameId: string;
    password: string;
    year: string;
    friends: string[];
    interests: string[];
  
    constructor({
      email,
      faculty,
      major,
      name,
      nameId,
      password,
      year,
      friends,
      interests,
    }: AccountProps) {
      this.email = email;
      this.faculty = faculty;
      this.major = major;
      this.name = name;
      this.nameId = nameId;
      this.password = password;
      this.year = year;
      this.friends = friends;
      this.interests = interests;
    }
  
    getEmail(): string {
      return this.email;
    }
  
    getFaculty(): string {
      return this.faculty;
    }
  

    getMajors(): string{
      return this.major;
    }
  
   
    getName(): string {
      return this.name;
    }
  
    getNameId(): string {
      return this.nameId;
    }
  
    getPassword(): string {
      return this.password;
    }
  
    getYear(): string {
      return this.year;
    }
  
    getFriends(): string[] {
      return this.friends;
    }
  
    getInterests(): string[] {
      return this.interests;
    }
  }
  
  export default Account;
  