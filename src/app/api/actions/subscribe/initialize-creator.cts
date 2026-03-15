import * as anchor from "@coral-xyz/anchor";
const { Program, BN, Wallet, AnchorProvider } = anchor;
import { PublicKey, Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import fs from "fs";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const idlData = fs.readFileSync("./solanatiers.json", "utf8");
const idl = JSON.parse(idlData);

const walletPath = process.env.HOME + "/.config/solana/id.json";

const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
const keypair = Keypair.fromSecretKey(secretKey);
const wallet = new Wallet(keypair);

const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
});

const PROGRAM_ID = new PublicKey("4NQ9RtQ3EYENFzb8qRN6ya3uYCmABKMNjgYfghBRWP4K");
const program = new Program(idl, provider);

async function initialize_creator() {

    const tierPrices = [
        new BN("10000000"),
        new BN("50000000"),
        new BN("100000000"),
        new BN("200000000"),    
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

async function get_creator() {

    const [creatorConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), keypair.publicKey.toBuffer()],
        PROGRAM_ID
    );

    console.log("PDA Creator:", creatorConfigPDA.toBase58());

    try {
        // Intentamos obtener los datos de la cuenta desde la blockchain
        // const account = await program.account.creatorConfig.fetch(creatorConfigPDA);
        const account: any = await (program.account as any).creatorConfig.fetch(creatorConfigPDA);

        console.log("\n✅ ¡Cuenta de Creador encontrada!");
        console.log("------------------------------------");
        console.log("Program:", program.programId.toBase58());
        console.log("Autoridad (Owner):", account.authority.toBase58());
        
        // Formateamos los precios de lamports a SOL para que sean legibles
        const pricesInSol = account.tierPrices.map((price: any) => price.toNumber() / 10**9);
        console.log("Precios de Tiers (SOL):", pricesInSol);
        console.log("------------------------------------");

    } catch (err) {
        console.error("\n❌ La cuenta no existe o no pudo ser leída.");
        console.log("Asegúrate de haber corrido el script de inicialización primero.");
    }
}

async function delete_creator() {

    const [creatorConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), keypair.publicKey.toBuffer()],
        PROGRAM_ID
    );

    try {
        const tx = await program.methods
        .deleteCreatorConfig()
        .accounts({
            creatorConfig: creatorConfigPDA,
            authority: keypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

        console.log("\n✅ ¡Cuenta de Creador eliminada!");
        console.log("Firma:", tx);

    } catch (err) {
        console.error("\n❌ La cuenta no existe o no pudo ser leída.");
        console.log("Asegúrate de haber corrido el script de inicialización primero.");
    }
}

// initialize_creator();

get_creator();

// delete_creator();