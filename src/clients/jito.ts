import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import axios from 'axios';
import bs58 from 'bs58';

export class JitoClient {
  private connection: Connection;
  private jitoRpcUrl: string;

  constructor(connection: Connection) {
    this.connection = connection;
    this.jitoRpcUrl = config.jitoRpcUrl;
    logger.info('Jito client initialized');
  }

  /**
   * Send transaction via Jito for faster confirmation
   */
  async sendTransaction(transaction: Transaction | VersionedTransaction): Promise<string> {
    try {
      const serializedTx = transaction instanceof VersionedTransaction
        ? Buffer.from(transaction.serialize()).toString('base64')
        : transaction.serialize({ requireAllSignatures: false }).toString('base64');

      // Jito block engine API endpoint
      const response = await axios.post(
        `${this.jitoRpcUrl}/api/v1/bundles`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [
            [serializedTx], // Bundle of transactions
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.error) {
        // Fallback to regular RPC if Jito fails
        logger.warn('Jito bundle failed, falling back to regular RPC:', response.data.error.message);
        return await this.sendViaRegularRpc(transaction);
      }

      const bundleId = response.data.result;
      logger.info(`Transaction sent via Jito bundle: ${bundleId}`);
      
      // Extract signature from transaction
      // The signature is computed when the transaction is signed
      let signature: string;
      if (transaction instanceof VersionedTransaction) {
        // For VersionedTransaction, signatures[0] is the signature bytes
        // Convert Uint8Array to base58
        const sigBytes = transaction.signatures[0];
        signature = bs58.encode(sigBytes);
      } else {
        if (!transaction.signature) {
          throw new Error('Transaction not signed');
        }
        signature = transaction.signature.toString();
      }
      
      await this.waitForConfirmation(signature);
      
      return signature;
    } catch (error) {
      logger.error('Error sending transaction via Jito, falling back to regular RPC:', error);
      return await this.sendViaRegularRpc(transaction);
    }
  }

  /**
   * Fallback to regular RPC sending
   */
  private async sendViaRegularRpc(transaction: Transaction | VersionedTransaction): Promise<string> {
    try {
      const signature = await this.connection.sendRawTransaction(
        transaction instanceof VersionedTransaction
          ? transaction.serialize()
          : transaction.serialize({ requireAllSignatures: false }),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );
      
      logger.info(`Transaction sent via regular RPC: ${signature}`);
      await this.waitForConfirmation(signature);
      return signature;
    } catch (error) {
      logger.error('Error sending via regular RPC:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(signature: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          logger.info(`Transaction confirmed: ${signature}`);
          return;
        }
        
        if (status.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error('Error checking transaction status:', error);
        throw error;
      }
    }
    
    throw new Error(`Transaction confirmation timeout: ${signature}`);
  }

  /**
   * Get tip accounts for Jito
   */
  async getTipAccounts(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.jitoRpcUrl}/api/v1/tip_accounts`);
      return response.data || [];
    } catch (error) {
      logger.warn('Error getting tip accounts, using defaults:', error);
      // Return default tip accounts
      return [];
    }
  }
}
