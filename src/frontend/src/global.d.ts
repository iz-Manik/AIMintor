// Declare modules for DFINITY packages
declare module '@dfinity/agent';
declare module '@dfinity/candid';
declare module '@dfinity/principal';

// Declare module for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
  }
}