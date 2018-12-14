import { TYPES } from '../di/types';
import { container } from '../di/container';
import { TransactionsController } from '../rest-controllers/transactions.controller';

export = container.get<TransactionsController>(TYPES.TransactionController);
