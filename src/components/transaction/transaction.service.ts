import logger from '@core/utils/logger';
import { ITransaction } from './transaction.interface';
import { TransactionModel } from './transaction.model';

const read = async (): Promise<ITransaction[]> => {
  try {
    const transactions: ITransaction[] = await TransactionModel.aggregate([
      { $sort: { timestamp: -1 } },
    ]);
    return transactions;
  } catch (error) {
    logger.error('Error occurred while reading transactions:', error);
    throw error;
  }
};

const readByHashId = async (hashId: String): Promise<ITransaction> => {
  const transaction = await TransactionModel.findOne({ hash: hashId });
  return transaction as ITransaction;
};

const getLatestList = async (): Promise<ITransaction[]> => {
  const transactions: ITransaction[] = await TransactionModel.aggregate([
    { $sort: { timestamp: -1 } },
    { $limit: 10 },
  ]);
  return transactions;
};

const readTransactionByPage = async (transaction: number): Promise<ITransaction[]> => {
  try {
    const pageSize = 10;
    const skipCount = (transaction - 1) * pageSize;
    const pageBlock: ITransaction[] = await TransactionModel.find()
      .sort({ timestamp: -1 })
      .skip(skipCount)
      .limit(pageSize);

    return pageBlock;
  } catch (error) {
    console.error('Error while reading the transactions:', error);
    throw error;
  }
};

const readNextTransactionByHashId = async (hashId: String): Promise<ITransaction> => {
  const currentTransaction = await TransactionModel.findOne({ hash: hashId });
  // eslint-disable-next-line no-underscore-dangle
  const nextTransaction = await TransactionModel.findOne({ _id: { $gt: currentTransaction._id } })
    .sort({ _id: 1 }) // Sort by _id in ascending order (insertion order)
    .limit(1); // Limit to the next transaction

  return nextTransaction as ITransaction;
};

const retrievePreviousTransactionsByHashId = async (hashId: String): Promise<ITransaction> => {
  const currentTransaction = await TransactionModel.findOne({ hash: hashId });
  const previousTransaction = await TransactionModel.findOne({
    timestamp: { $lt: currentTransaction.timestamp }, // Find transactions with timestamp less than current
  })
    .sort({ timestamp: -1 }) // Sort by _id in ascending order (insertion order)
    .limit(1); // Limit to the next transaction

  return previousTransaction as ITransaction;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getThirtyDayTransactionNumber = async (): Promise<
  { date: string; transactionCount: number }[]
> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Generate an array of dates for the last 30 days
  const dates = [];
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date)); // Format date here and push into the array
  }

  try {
    const result = await TransactionModel.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }, // Filter transactions from the last 30 days
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, // Group transactions by date
          transactionCount: { $sum: 1 }, // Count the number of transactions for each date
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          transactionCount: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // Create a map from the result for quick access
    const resultMap = new Map(result.map((item) => [item.date, item.transactionCount]));

    // Populate the result array with transaction counts for all dates
    const finalResult = dates.map((date) => ({
      date,
      transactionCount: resultMap.get(date) || 0, // Use logical OR to handle missing counts
    }));

    logger.debug('Successfully retrieved transaction count for the last 30 days');
    return finalResult;
  } catch (error) {
    logger.error('Error finding transaction count by date:', error);
    throw error; // Re-throw the error to propagate it to the caller
  }
};

const getTransactionStatistics = async (): Promise<{
  totalTransactions: number;
  maxTransactionPerDay: number;
}> => {
  try {
    // Get total number of transactions
    const totalResult = await TransactionModel.countDocuments({});
    // Get max transactions per day
    const maxResult = await TransactionModel.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          maxTransactionPerDay: { $max: '$transactionCount' },
        },
      },
    ]);

    // Extract the total number of transactions and the max transactions per day from the result
    const totalTransactions = totalResult;
    const maxTransactionPerDay = maxResult.length > 0 ? maxResult[0].maxTransactionPerDay : 0;

    // Return the results
    return { totalTransactions, maxTransactionPerDay };
  } catch (error) {
    logger.error('Error retrieving transaction statistics:', error);
    throw error;
  }
};

const getTransactionCount = async (): Promise<number> => {
  // Count the number of documents in the TransactionModel collection
  const transactionCount = await TransactionModel.countDocuments();
  return transactionCount;
};

// eslint-disable-next-line import/prefer-default-export
export {
  getLatestList,
  read,
  readByHashId,
  readTransactionByPage,
  readNextTransactionByHashId,
  retrievePreviousTransactionsByHashId,
  getThirtyDayTransactionNumber,
  getTransactionStatistics,
  getTransactionCount,
};
