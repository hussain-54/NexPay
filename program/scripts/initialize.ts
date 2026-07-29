import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexpayProgram } from "../target/types/nexpay_program";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.NexpayProgram as Program<NexpayProgram>;

  const [configPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const tx = await program.methods
    .initializePlatform()
    .accounts({
      admin: provider.wallet.publicKey,
      platformConfig: configPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("Platform initialized. Tx:", tx);
  console.log("Program ID:", program.programId.toString());
  console.log("Config PDA:", configPDA.toString());
}

main().catch(console.error);
