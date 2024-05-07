import Web3 from 'web3';
import config from '@config/config';
import logger from '@core/utils/logger';
import { TransactionModel } from '@components/transaction/transaction.model';

class TransactionService {
  web3: Web3;

  pollingInterval: number;

  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.privateNetwork));
  }

  async detectAndSaveTransactions(latestBlockNumber?: number) {
    try {
      // Fetch latest block
      // eslint-disable-next-line no-param-reassign
      if (!latestBlockNumber) latestBlockNumber = Number(await this.web3.eth.getBlockNumber());
      const latestBlock = await this.web3.eth.getBlock(latestBlockNumber, true);

      if (!latestBlock || !latestBlock.transactions) {
        logger.info('No transactions found in the latest block.');
        return;
      }

      console.log(latestBlock);
      // Process transactions in the latest block
      // eslint-disable-next-line consistent-return
      const transactionPromises = latestBlock.transactions.map(async (tx) => {
        if (typeof tx !== 'string') {
          const transaction = await this.web3.eth.getTransactionReceipt(tx.hash);
          if (!transaction) {
            logger.info('No transactions receipt found');
          }

          const { baseFeePerGas } = latestBlock;
          const priorityFeePerGas =
            Number(tx.maxPriorityFeePerGas) || Number(tx.gasPrice) - Number(baseFeePerGas);

          const transactionData = {
            hash: tx.hash,
            block: Number(latestBlock.number),
            senderAddress: tx.from,
            amount: Number(this.web3.utils.fromWei(tx.value.toString(), 'ether')),
            receiverAddress: tx.to || 'null',
            contractAddress: transaction.contractAddress || 'null',
            status: transaction.status,
            input: tx.input || '0x',
            value: Number(this.web3.utils.fromWei(tx.value.toString(), 'ether')),
            gasPrice: tx.gasPrice
              ? Number(this.web3.utils.fromWei(tx.gasPrice.toString(), 'gwei'))
              : 0,
            gasLimit: Number(tx.gas),
            gasUsed: Number(transaction.gasUsed),
            gasFees: Number(this.web3.utils.fromWei((tx.gasPrice * tx.gas).toString(), 'ether')),
            timestamp: new Date(Number(latestBlock.timestamp) * 1000),
            maxFeePerGas: tx.maxFeePerGas
              ? Number(this.web3.utils.fromWei(tx.maxFeePerGas.toString(), 'gwei'))
              : 0,
            maxPriorityFeePerGas: priorityFeePerGas
              ? Number(this.web3.utils.fromWei(priorityFeePerGas.toString(), 'gwei'))
              : 0,
            baseFeePerGas: baseFeePerGas
              ? Number(this.web3.utils.fromWei(baseFeePerGas.toString(), 'gwei'))
              : 0,
            // Calculate the transaction fee based on EIP-1559
            transactionFee: transaction.effectiveGasPrice
              ? Number(
                  this.web3.utils.fromWei(
                    (
                      Number(transaction.effectiveGasPrice) * Number(transaction.gasUsed)
                    ).toString(),
                    'ether'
                  )
                )
              : 0,
          };

          console.log(transaction.status, tx.input);
          logger.info(`Transactions saved: ${tx.hash}`);
          return TransactionModel.create(transactionData);
        }
      });

      await Promise.all(transactionPromises);
    } catch (error) {
      logger.error('Error detecting and saving transactions:', error);
    }
  }
}

export default new TransactionService();