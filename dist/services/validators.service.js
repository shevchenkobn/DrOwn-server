"use strict";
// import * as Ajv from 'ajv';
// import { IUserSeed } from '../models/users.model';
//
// const ajv = new Ajv({});
// ajv.addKeyword('date', {
//   validate(schema: any, data: any) {
//     return data instanceof Date || (!schema && data === null);
//   },
//   metaSchema: {
//     type: 'boolean', // shows if nullable
//   },
//   errors: false,
// });
// const validate = ajv.compile({
//   "properties": {
//     "email": {
//       "type": "string",
//       "maxLength": 60,
//       "format": "email",
//     },
//     "password": {
//       "anyOf": [
//         {
//           "type": "string",
//           "maxLength": 62,
//         },
//         {
//           "type": "null",
//         }
//       ],
//     },
//     "name": {
//       "type": "string",
//       "maxLength": 120,
//     },
//     "companyId": {
//       "anyOf": [
//         {
//           "type": "string",
//           "maxLength": 19,
//           "pattern": "^\\d+$",
//         },
//         {
//           "type": "null",
//         }
//       ],
//     },
//     "address": {
//       "anyOf": [
//         {
//           "type": "string",
//           "maxLength": 150,
//         },
//         {
//           "type": "null",
//         }
//       ],
//     },
//     "phoneNumber": {
//       "anyOf": [
//         {
//           "type": "string",
//           "maxLength": 15,
//         },
//         {
//           "type": "null",
//         }
//       ],
//     },
//     "cash": {
//       "anyOf": [
//         {
//           "type": "string",
//           "maxLength": 10,
//           "pattern": "^\\d{1,7}(\\.\\d{0,2})$",
//         },
//         {
//           "type": "null",
//         }
//       ],
//     },
//   }
// });
//
// export function isCreateUser(obj: any): obj is IUserSeed {
//   return validate(obj) as boolean;
// }
//# sourceMappingURL=validators.service.js.map