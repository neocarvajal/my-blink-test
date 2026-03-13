import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse, 
  ACTIONS_CORS_HEADERS, 
  createPostResponse 
} from "@solana/actions";
import { 
  clusterApiUrl, 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// --- CONFIGURACIÓN DE TUS WALLETS DE PRUEBA ---
const MI_WALLET_CREADOR = "3gb1RurijBbsQLNfpV1xqosUZhPxX4PfvGjGtEAGp8gj"; // Reemplaza con tu Wallet 1
const MI_WALLET_REFERIDO = "8H8nCS6JUhKNJRHbC2fmr6ofHRLsYCapqVmb5CJJ6VE6"; // Reemplaza con tu Wallet 2 (o la misma para pruebas)

// --- GET: Define la interfaz visual del Blink ---
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  
  // Extraemos nombre del creador si viene en la URL, si no, usamos uno por defecto
  const creatorName = searchParams.get("creator_name") || "Erick Developer";

  const payload: ActionGetResponse = {
    type: "action",
    icon: "https://ucarecdn.com/7aa46575-d336-427d-8957-8884ca40db12/", // Banner oficial de Solana Actions
    title: `Suscripción a ${creatorName}`,
    description: `Apoya este proyecto en Devnet. Los fondos se enviarán a tu wallet configurada.`,
    label: "Suscribirse",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Tier Plata (0.01 SOL)",
          // Pasamos las direcciones reales y el monto al POST
          href: `/api/actions/subscribe?amount=0.01&creator=${MI_WALLET_CREADOR}&ref=${MI_WALLET_REFERIDO}`,
        },
        {
          type: "transaction",
          label: "Tier Oro (0.05 SOL)",
          href: `/api/actions/subscribe?amount=0.05&creator=${MI_WALLET_CREADOR}&ref=${MI_WALLET_REFERIDO}`,
        }
      ]
    }
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

// Habilita CORS para que las wallets puedan consultar el endpoint
export const OPTIONS = GET;

// --- POST: Construye la transacción real ---
export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const body: ActionPostRequest = await req.json();
    
    // 1. Validar la cuenta del usuario que hace click
    let subscriber: PublicKey;
    try {
      subscriber = new PublicKey(body.account);
    } catch (err) {
      return Response.json({ error: "Wallet del usuario inválida" }, { 
        status: 400, 
        headers: ACTIONS_CORS_HEADERS 
      });
    }

    // 2. Obtener la wallet del creador desde los parámetros de la URL
    const creatorAddress = searchParams.get("creator");
    if (!creatorAddress) {
      return Response.json({ error: "No se proporcionó wallet de destino" }, { 
        status: 400, 
        headers: ACTIONS_CORS_HEADERS 
      });
    }
    const creator = new PublicKey(creatorAddress);

    // 3. Configurar conexión y monto
    const connection = new Connection(clusterApiUrl("devnet"));
    const amount = parseFloat(searchParams.get("amount") || "0.01");

    // 4. Crear la transacción de transferencia real
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: subscriber,
        toPubkey: creator,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    // 5. Configurar el "Fee Payer" y el bloque reciente
    transaction.feePayer = subscriber;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // 6. Responder con la transacción lista para firmar
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Enviando ${amount} SOL a ${creator.toBase58().slice(0, 4)}...`,
      },
    });

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (err) {
    console.error("Error en el POST:", err);
    return Response.json({ error: "Error interno al procesar la suscripción" }, { 
      status: 400, 
      headers: ACTIONS_CORS_HEADERS 
    });
  }
};