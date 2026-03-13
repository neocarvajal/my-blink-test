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

const MI_WALLET_CREADOR = "3gb1RurijBbsQLNfpV1xqosUZhPxX4PfvGjGtEAGp8gj";
const MI_WALLET_REFERIDO = "8H8nCS6JUhKNJRHbC2fmr6ofHRLsYCapqVmb5CJJ6VE6";

const SHARED_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "X-Action-Version": "1",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const creatorName = searchParams.get("creator_name") || "Erick Developer";

  const payload: ActionGetResponse = {
    type: "action",
    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    title: `Suscripción a ${creatorName}`,
    description: `Apoya este proyecto en Devnet. Los fondos se enviarán a tu wallet configurada.`,
    label: "Suscribirse",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Tier Plata (0.01 SOL)",
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

  return Response.json(payload, { headers: SHARED_HEADERS });
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const body: ActionPostRequest = await req.json();
    
    let subscriber: PublicKey;
    try {
      subscriber = new PublicKey(body.account);
    } catch (err) {
      return Response.json({ error: "Wallet del usuario inválida" }, { 
        status: 400, 
        headers: SHARED_HEADERS 
      });
    }

    const creatorAddress = searchParams.get("creator");
    if (!creatorAddress) {
      return Response.json({ error: "No se proporcionó wallet de destino" }, { 
        status: 400, 
        headers: SHARED_HEADERS 
      });
    }
    const creator = new PublicKey(creatorAddress);

    const connection = new Connection(clusterApiUrl("devnet"));
    const amount = parseFloat(searchParams.get("amount") || "0.01");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: subscriber,
        toPubkey: creator,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    transaction.feePayer = subscriber;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Enviando ${amount} SOL a ${creator.toBase58().slice(0, 4)}...`,
      },
      options: {
        commitment: "confirmed",
      }
    });

    return Response.json(payload, { headers: SHARED_HEADERS });

  } catch (err) {
    return Response.json({ error: "Error interno al procesar la suscripción" }, { 
      status: 400, 
      headers: SHARED_HEADERS 
    });
  }
};