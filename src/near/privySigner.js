// Firmante de transacciones NEAR con la wallet embebida de Privy.
// Basado en el ejemplo oficial near-examples/hello-privy.
import { Account } from '@near-js/accounts';
import { Signature, SignedTransaction } from '@near-js/transactions';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export class PrivySigner {
  constructor(signRawHash, accountId, provider) {
    this.signRawHash = signRawHash;
    this.accountId = accountId;
    this.provider = provider;
  }

  async getPublicKey() {
    const account = new Account(this.accountId, this.provider);
    const keys = await account.getAccessKeyList();
    return keys.keys[0].public_key;
  }

  async signTransaction(transaction) {
    const txHash = bytesToHex(sha256(transaction.encode()));
    const raw = await this.signRawHash({
      address: this.accountId,
      chainType: 'near',
      hash: `0x${txHash}`,
    });
    const signature = new Signature({
      keyType: transaction.publicKey.keyType,
      data: hexToBytes(raw.signature.slice(2)),
    });
    return [[], new SignedTransaction({ transaction, signature })];
  }
}
