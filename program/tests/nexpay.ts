import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexpayProgram } from "../target/types/nexpay_program";
import { expect } from "chai";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";

describe("nexpay_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexpayProgram as Program<NexpayProgram>;
  const admin = provider.wallet;

  const sender = anchor.web3.Keypair.generate();
  const recipient = anchor.web3.Keypair.generate();
  const feeWallet = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let senderAta: anchor.web3.PublicKey;
  let recipientAta: anchor.web3.PublicKey;
  let feeAta: anchor.web3.PublicKey;

  let configPda: anchor.web3.PublicKey;
  let senderPda: anchor.web3.PublicKey;
  let recipientPda: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop sol to users
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(sender.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(recipient.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );

    // Setup mock USDC
    mint = await createMint(
      provider.connection,
      sender,
      admin.publicKey,
      null,
      6
    );

    senderAta = await createAssociatedTokenAccount(
      provider.connection,
      sender,
      mint,
      sender.publicKey
    );

    recipientAta = await createAssociatedTokenAccount(
      provider.connection,
      sender,
      mint,
      recipient.publicKey
    );

    feeAta = await createAssociatedTokenAccount(
      provider.connection,
      sender,
      mint,
      feeWallet.publicKey
    );

    // Mint 1000 USDC to sender
    await mintTo(
      provider.connection,
      sender,
      mint,
      senderAta,
      admin.publicKey,
      1000_000_000,
      [admin.payer]
    );

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [senderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), sender.publicKey.toBuffer()],
      program.programId
    );

    [recipientPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), recipient.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Is initialized!", async () => {
    await program.methods
      .initializePlatform()
      .accounts({
        admin: admin.publicKey,
        platformConfig: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.platformConfig.fetch(configPda);
    expect(config.feeBasisPoints).to.equal(10);
    expect(config.admin.toString()).to.equal(admin.publicKey.toString());
  });

  it("Initializes users", async () => {
    await program.methods
      .initializeUser("Alice", "REF123")
      .accounts({
        user: sender.publicKey,
        userAccount: senderPda,
        platformConfig: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    await program.methods
      .initializeUser("Bob", "REF456")
      .accounts({
        user: recipient.publicKey,
        userAccount: recipientPda,
        platformConfig: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([recipient])
      .rpc();

    const senderData = await program.account.userAccount.fetch(senderPda);
    expect(senderData.username).to.equal("Alice");
    expect(senderData.kycVerified).to.be.false;
  });

  it("Admin updates KYC for sender", async () => {
    await program.methods
      .updateKycStatus(true, 1) // Pro tier
      .accounts({
        admin: admin.publicKey,
        platformConfig: configPda,
        userAccount: senderPda,
      })
      .rpc();

    const senderData = await program.account.userAccount.fetch(senderPda);
    expect(senderData.kycVerified).to.be.true;
    expect(senderData.tier).to.equal(1);
  });

  it("Admin updates KYC for recipient", async () => {
    await program.methods
      .updateKycStatus(true, 1)
      .accounts({
        admin: admin.publicKey,
        platformConfig: configPda,
        userAccount: recipientPda,
      })
      .rpc();

    const recipientData = await program.account.userAccount.fetch(recipientPda);
    expect(recipientData.kycVerified).to.be.true;
  });

  it("Fails to transfer if frozen", async () => {
    await program.methods
      .freezeWallet(true)
      .accounts({
        caller: admin.publicKey,
        userAccount: senderPda,
        platformConfig: configPda,
      })
      .rpc();

    const transferAmount = new anchor.BN(500_000_000);
    const countBuffer = Buffer.alloc(4);
    countBuffer.writeUInt32LE(0, 0);

    const [transferRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), countBuffer],
      program.programId
    );

    try {
      await program.methods
        .transferStablecoin(transferAmount, "PK", "test memo")
        .accounts({
          sender: sender.publicKey,
          senderUserAccount: senderPda,
          recipientUserAccount: recipientPda,
          senderTokenAccount: senderAta,
          recipientTokenAccount: recipientAta,
          feeTokenAccount: feeAta,
          transferRecord: transferRecordPda,
          platformConfig: configPda,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        })
        .signers([sender])
        .rpc();
      expect.fail("Should have failed because frozen");
    } catch (e: any) {
      expect(e.error.errorMessage).to.equal("Wallet is frozen");
    }

    // Unfreeze
    await program.methods
      .freezeWallet(false)
      .accounts({
        caller: admin.publicKey,
        userAccount: senderPda,
        platformConfig: configPda,
      })
      .rpc();
  });

  it("Transfers stablecoin successfully", async () => {
    // We send 500 USDC
    const transferAmount = new anchor.BN(500_000_000); // 500 * 10^6

    // Update fee wallet in config to be the feeAta owner (feeWallet)
    // Actually the instruction just transfers to fee_token_account directly

    const senderDataBefore = await program.account.userAccount.fetch(senderPda);
    const countBuffer = Buffer.alloc(4);
    countBuffer.writeUInt32LE(senderDataBefore.transferCount, 0);

    const [transferRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer"), sender.publicKey.toBuffer(), countBuffer],
      program.programId
    );

    await program.methods
      .transferStablecoin(transferAmount, "PK", "test memo")
      .accounts({
        sender: sender.publicKey,
        senderUserAccount: senderPda,
        recipientUserAccount: recipientPda,
        senderTokenAccount: senderAta,
        recipientTokenAccount: recipientAta,
        feeTokenAccount: feeAta,
        transferRecord: transferRecordPda,
        platformConfig: configPda,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([sender])
      .rpc();

    const recipientAtaAccount = await getAccount(provider.connection, recipientAta);
    const feeAtaAccount = await getAccount(provider.connection, feeAta);

    // Fee = 500 * 0.001 = 0.5 USDC = 500_000 micro-units
    // Net = 499.5 USDC = 499_500_000 micro-units
    expect(recipientAtaAccount.amount.toString()).to.equal("499500000");
    expect(feeAtaAccount.amount.toString()).to.equal("500000");

    const record = await program.account.transferRecord.fetch(transferRecordPda);
    expect(record.amountUsdc.toString()).to.equal("500000000");
    expect(record.feeCollected.toString()).to.equal("500000");
    expect(record.status).to.equal(1);
    expect(record.txHashRef).to.equal("test memo");
  });

  it("Updates platform fee", async () => {
    await program.methods
      .updatePlatformFee(20) // 0.2%
      .accounts({
        admin: admin.publicKey,
        platformConfig: configPda,
      })
      .rpc();

    const config = await program.account.platformConfig.fetch(configPda);
    expect(config.feeBasisPoints).to.equal(20);
  });
});
