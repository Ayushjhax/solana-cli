import { Command } from 'commander';
import { 
  Keypair, 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  SystemProgram, 
  Transaction
} from '@solana/web3.js';
import * as fs from 'fs';

const KEYPAIR_PATH = './wallet-keypair.json';

const program = new Command();

program
  .version('0.0.1')
  .description('Solana CLI Wallet');

function getOrCreateKeypair(): Keypair {
  try {
    const keypairString = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
    const keypairData = JSON.parse(keypairString);
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    const newKeypair = Keypair.generate();
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(newKeypair.secretKey)));
    return newKeypair;
  }
}

program
  .command('generate-keypair')
  .description('Generate a new keypair')
  .action(() => {
    const keypair = getOrCreateKeypair();
    console.log('Public Key:', keypair.publicKey.toString());
    console.log('Private Key:', Buffer.from(keypair.secretKey).toString('hex'));
    console.log('Keypair saved to', KEYPAIR_PATH);
  });

program
  .command('airdrop <amount>')
  .description('Request an airdrop of SOL')
  .action(async (amount: string) => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const keypair = getOrCreateKeypair();
    
    try {
      const signature = await connection.requestAirdrop(
        keypair.publicKey,
        parseFloat(amount) * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      console.log(`Airdropped ${amount} SOL to ${keypair.publicKey.toString()}`);
    } catch (error) {
      console.error('Airdrop failed:', error);
    }
  });

program
  .command('balance')
  .description('Check wallet balance')
  .action(async () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const keypair = getOrCreateKeypair();
    
    try {
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  });

program
  .command('send <amount> <recipient>')
  .description('Send SOL to an address')
  .action(async (amount: string, recipient: string) => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const sender = getOrCreateKeypair();
    const recipientPubkey = new PublicKey(recipient);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: recipientPubkey,
          lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
        })
      );

      const signature = await connection.sendTransaction(transaction, [sender]);
      await connection.confirmTransaction(signature);
      console.log(`Sent ${amount} SOL to ${recipient}. Transaction signature: ${signature}`);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  });

program.parse(process.argv);