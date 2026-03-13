import { Connection, PublicKey, Blockhash } from '@solana/web3.js';
import { config } from '../config';
import { logger } from '../utils/logger';

export class HeliusClient {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.heliusRpcUrl, 'confirmed');
    logger.info('Helius RPC client initialized');
  }

  async getLatestBlockhash(): Promise<Blockhash> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      return blockhash;
    } catch (error) {
      logger.error('Error getting latest blockhash:', error);
      throw error;
    }
  }

  async getRecentBlockhash(): Promise<Blockhash> {
    try {
      const { blockhash } = await this.connection.getRecentBlockhash('finalized');
      return blockhash;
    } catch (error) {
      logger.error('Error getting recent blockhash:', error);
      throw error;
    }
  }

  getConnection(): Connection {
    return this.connection;
  }
}
