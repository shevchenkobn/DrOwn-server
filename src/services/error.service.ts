export enum ErrorCode {
  GQL_VALUE_BAD = 'GQL_VALUE_BAD',
  GQL_DIRECTIVE_TARGED = 'GQL_DIRECTIVE_TARGED',

  AUTH_NO = 'AUTH_NO',
  AUTH_ROLE = 'AUTH_ROLE',
  AUTH_BAD = 'AUTH_BAD',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  USER_NO_COMPANY = 'USER_NO_COMPANY',
  USER_NO_REGISTER_DATA = 'USER_NO_REGISTER_DATA',
  USER_DUPLICATE_EMAIL = 'USER_DUPLICATE_EMAIL',
}

export class LogicError extends TypeError {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    if (!message) {
      super(code);
    } else {
      super(message);
    }
    this.code = code;
  }
}
