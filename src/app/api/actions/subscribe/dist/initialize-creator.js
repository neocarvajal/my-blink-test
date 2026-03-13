"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = require("@coral-xyz/anchor");
const { Program, BN, Wallet, AnchorProvider } = anchor;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
// 1. Carga manual del IDL para evitar errores de 'import attribute'
const idlPath = path_1.default.resolve(__dirname, "./solanatiers.json");
if (!fs_1.default.existsSync(idlPath)) {
    console.error("❌ No se encontró el archivo solanatiers.json en la ruta:", idlPath);
    process.exit(1);
}
const idl = JSON.parse(fs_1.default.readFileSync(idlPath, "utf8"));
async function main() {
    // 2. Configuración de Conexión (Devnet)
    const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)("devnet"), "confirmed");
    // 3. Carga de tu Wallet local (Asegúrate de tener solana-cli configurado)
    // En Linux/Mac: ~/.config/solana/id.json
    const walletPath = path_1.default.join(process.env.HOME || process.env.USERPROFILE || "", ".config", "solana", "id.json");
    if (!fs_1.default.existsSync(walletPath)) {
        console.error("❌ No se encontró tu llave privada en:", walletPath);
        console.log("Tip: Asegúrate de haber corrido 'solana-keygen new' o apunta manualmente a tu archivo .json");
        return;
    }
    const secretKey = Uint8Array.from(JSON.parse(fs_1.default.readFileSync(walletPath, "utf-8")));
    const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);
    // 4. Configurar el Provider
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    const PROGRAM_ID = new web3_js_1.PublicKey("Eu6HDSN97Pu7o8SvRt2k6jJuYbDGRh85czL71cW8x8PB");
    const program = new Program(idl, provider);
    // 5. Definir Precios de los Tiers (Deben ser 4 valores por el array [u64; 4] de Rust)
    // Los montos están en Lamports (1 SOL = 1,000,000,000 Lamports)
    const tierPrices = [
        new BN(0), // Tier 0: No usado
        new BN(0.01 * 10 ** 9), // Tier 1: 0.01 SOL
        new BN(0.05 * 10 ** 9), // Tier 2: 0.05 SOL
        new BN(0.10 * 10 ** 9), // Tier 3: 0.10 SOL
    ];
    // 6. Calcular la PDA del CreatorConfig
    const [creatorConfigPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("creator"), keypair.publicKey.toBuffer()], PROGRAM_ID);
    console.log("--- SolanaTiers: Inicializando Creador ---");
    console.log("ID del Programa:", PROGRAM_ID.toBase58());
    console.log("Tu Wallet:", keypair.publicKey.toBase58());
    console.log("PDA a crear:", creatorConfigPDA.toBase58());
    try {
        const tx = await program.methods
            .initializeCreator(tierPrices)
            .accounts({
            creatorConfig: creatorConfigPDA,
            authority: keypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log("\n✅ ¡Configuración de Creador exitosa!");
        console.log("Firma de la transacción:", tx);
        console.log(`Ver en Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    }
    catch (err) {
        // Manejo amigable si la cuenta ya existe
        if (err.logs && err.logs.some((log) => log.includes("already in use"))) {
            console.log("\nℹ️  Aviso: Tu cuenta de creador ya estaba inicializada.");
        }
        else {
            console.error("\n❌ Error al ejecutar initializeCreator:", err);
        }
    }
}
main();
