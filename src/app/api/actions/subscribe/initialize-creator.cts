import * as anchor from "@coral-xyz/anchor";
const { Program, BN, Wallet, AnchorProvider } = anchor;
import { PublicKey, Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import fs from "fs";

async function initialize_creator() {

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

async function get_creator() {
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

    const PROGRAM_ID = new PublicKey("Eu6HDSN97Pu7o8SvRt2k6jJuYbDGRh85czL71cW8x8PB");
    const program = new Program(idl, provider);

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

// initialize_creator();

get_creator();