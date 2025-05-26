class ErrorHandler extends Error {
    constructor(public message: string, public statusCode: number,public custom:boolean=false) {
      super(message);
      this.statusCode =statusCode;
      this.custom = custom;
    }
  }
  
  export default ErrorHandler;
  