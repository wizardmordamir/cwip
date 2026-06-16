// cwip/excel — read/write spreadsheets over the optional `xlsx` (SheetJS) peer.
// Importing this module is cheap; xlsx is resolved only when you read or write.
export * from './readWorkbook';
export * from './writeWorkbook';
