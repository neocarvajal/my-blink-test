import * as anchor from "@coral-xyz/anchor";
const { Program, BN, Wallet, AnchorProvider } = anchor;
import { PublicKey, Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import fs from "fs";

async function main() {

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
    const idlData = fs.readFileSync("./solanatiers.json", "utf8");
    const idl = JSON.parse(idlData);
    
    const walletPath = process.env.HOME + "/.config/solana/id.json";
    
    if (!fs.existsSync(walletPath)) {
        console.error("❌ No se encontró tu llave privada en:", walletPath);
        return;
    }
    
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
    const keypair = Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);

    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });

    const PROGRAM_ID = new PublicKey("Eu6HDSN97Pu7o8SvRt2k6jJuYbDGRh85czL71cW8x8PB");
    const program = new Program(idl, provider);

    const tierPrices = [
        new BN(0),                      
        new BN(0.01 * 10 ** 9),         
        new BN(0.05 * 10 ** 9),         
        new BN(0.10 * 10 ** 9),         
    ];

    const [creatorConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), keypair.publicKey.toBuffer()],
        PROGRAM_ID
    );

    console.log("--- SolanaTiers: Inicializando Creador ---");
    console.log("Wallet:", keypair.publicKey.toBase58());

    try {
        const tx = await program.methods
            .initializeCreator(tierPrices)
            .accounts({
                creatorConfig: creatorConfigPDA,
                authority: keypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log("\n✅ ¡Configuración exitosa!");
        console.log("Firma:", tx);
        
    } catch (err: any) {
        if (err.logs && err.logs.some((log: string) => log.includes("already in use"))) {
            console.log("\nℹ️  Aviso: La cuenta ya existe.");
        } else {
            console.error("\n❌ Error:", err);
        }
    }
}

main();