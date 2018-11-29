"use strict";
// import { IUser, UserRoles } from './models/users.model';
// import { getRefreshToken, getRefreshTokenExpiration, getUserFromRequest } from './services/authentication.service';
// import { ErrorCode, LogicError } from './services/error.service';
// import { getSelectColumns } from './services/util.service';
// import { compare } from 'bcrypt';
//
// const decimalPattern = /^\d{1,7}(\.\d{0,2)?'/;
// const decimalType = {
//   description: 'A type that stores cash precisely (7 before floating point, 2 after)',
// };
//
// const emailPattern = /"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"/
//
// const passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{6,}$/;
// // try use as format either;
// const numberPattern = "^[\\d]{1,15}$";
//
//
//
//
// export const resolvers: IResolvers = {
//   Query: {
//     userRoles() {
//       return UserRoles;
//     },
//     users(_, args, ctx, info) {
//       // FIXME: check optimized retrieval of specific fields
//       return userModel.select(getSelectColumns(info) as any);
//     },
//   },
//
//   Mutation: {
//     async authenticate(_, { email, password }) {
//       const users: IUser[] = await userModel.table.where({
//         email,
//       }).select();
//       if (users.length === 0 || !await compare(password, users[0].passwordHash)) {
//         throw new LogicError(ErrorCode.AUTH_BAD);
//       }
//       const user = users[0];
//
//       const updateData: {[column: string]: any} = {
//         refreshTokenExpiration: getRefreshTokenExpiration(),
//       };
//       if (!user.refreshToken) {
//         updateData.refreshToken = await getRefreshToken(user);
//       }
//       await userModel.table.where({
//         userId: user.userId,
//       }).update(updateData);
//
//       return {
//         accessToken: jwt.encode(user),
//         refreshToken: updateData.refreshToken || user.refreshToken,
//       };
//     },
//
//     registerUser(_, { userSeed }, ctx, info) {
//       // FIXME: check optimized retrieval of specific fields
//       return userModel.create(userSeed, true, getSelectColumns(info) as any);
//     },
//
//     async getAccessToken(_, { refreshToken }) {
//       // NOTE: only 2 fields are retrieved, should be changed if auth algos changed
//       const users = await userModel.table.where({ refreshToken }).select();
//
//       if (!users || users.length === 0) {
//         throw new LogicError(ErrorCode.AUTH_BAD);
//       }
//
//       const user = users[0];
//       if (refreshToken !== user.refreshToken) {
//         throw new LogicError(ErrorCode.AUTH_BAD);
//       }
//
//       const now = Date.now();
//       if (now >= user.refreshTokenExpiration!.getTime()) {
//         await userModel.table.where({ userId: user.userId }).update({
//           refreshToken: null,
//           refreshTokenExpiration: null,
//         });
//         throw new LogicError(ErrorCode.AUTH_EXPIRED);
//       }
//
//       await userModel.table.where({
//         userId: user.userId,
//       }).update({
//         refreshTokenExpiration: getRefreshTokenExpiration(),
//       });
//
//       return {
//         refreshToken,
//         accessToken: jwt.encode(user),
//       };
//     },
//   },
// };
//# sourceMappingURL=swagger.js.map