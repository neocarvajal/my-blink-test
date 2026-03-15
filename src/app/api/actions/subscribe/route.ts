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
  SystemProgram
} from "@solana/web3.js";
import { Program, Idl, BN } from "@coral-xyz/anchor";
import idl from "./solanatiers.json";

type Solanatiers = Idl;
const PROGRAM_ID = new PublicKey("Eu6HDSN97Pu7o8SvRt2k6jJuYbDGRh85czL71cW8x8PB");
const MI_WALLET_CREADOR: PublicKey = new PublicKey("neoYtXTopQCbg2eWJhsT3uTTUJKCvnWwgC3NppJD1cS");
const MI_WALLET_REFERIDO: PublicKey = new PublicKey("8H8nCS6JUhKNJRHbC2fmr6ofHRLsYCapqVmb5CJJ6VE6");
const LOGO_URL = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

const SHARED_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "X-Action-Version": "1",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};

export const GET = async (req: Request) => {
  // --- INICIO BLOQUE METADATOS PARA TWITTER ---
  if (!req.headers.get("x-action-version")) {
    return new Response(
      `<html>
        <head>
          <meta property="og:title" content="SolanaTiers Protocol" />
          <meta property="og:description" content="Activa tu suscripción descentralizada. 90% para el creador, 10% para el referente." />
          <meta property="og:image" content="${LOGO_URL}" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="SolanaTiers Protocol" />
          <meta name="twitter:description" content="Activa tu suscripción descentralizada en Solana." />
          <meta name="twitter:image" content="${LOGO_URL}" />
        </head>
        <body style="background-color: #000; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh;">
          Redirigiendo a SolanaTiers...
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
  // --- FIN BLOQUE METADATOS ---

  const payload: ActionGetResponse = {
    type: "action",
    icon: LOGO_URL,
    title: "SolanaTiers Protocol",
    description: "Activa tu suscripción descentralizada. 90% para el creador, 10% para el referente.",
    label: "Suscribirse",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Tier 1 (Plata)",
          href: `/api/actions/subscribe?tier=1&index=0&ref=${MI_WALLET_REFERIDO}`,
        },
        {
          type: "transaction",
          label: "Tier 2 (Oro)",
          href: `/api/actions/subscribe?tier=2&index=0&ref=${MI_WALLET_REFERIDO}`,
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
    
    // Validar cuenta del suscriptor
    const subscriber = new PublicKey(body.account);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Parámetros dinámicos desde la URL
    const tier = parseInt(searchParams.get("tier") || "1");
    const index = parseInt(searchParams.get("index") || "0");
    const referrer = new PublicKey(searchParams.get("ref") || MI_WALLET_REFERIDO.toBase58());
    const creator = MI_WALLET_CREADOR;

    // 2. Inicializar Programa de forma manual para Vercel
    const program = new Program(idl as Solanatiers, { connection });

    // 3. Cálculo de PDAs (Sincronizado con el código Rust)
    
    // b"creator" + creator_pubkey
    const [creatorConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator"), creator.toBuffer()],
      PROGRAM_ID
    );

    // b"user" + subscriber + creator + index (u64 le)
    const subscriptionIndexBN = new BN(index);
    const [userSubscriptionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        subscriber.toBuffer(),
        creator.toBuffer(),
        subscriptionIndexBN.toArrayLike(Buffer, "le", 8)
      ],
      PROGRAM_ID
    );

    console.log("User Subscription PDA:", userSubscriptionPDA.toBase58());

    // 4. Construir Instrucción del Contrato
    const instruction = await program.methods
      .subscribe(new BN(tier), subscriptionIndexBN)
      .accounts({
        creatorConfig: creatorConfigPDA,
        userSubscription: userSubscriptionPDA,
        subscriber: subscriber,
        creator: creator,
        referrer: referrer,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction();
    
    transaction.add(instruction);
    transaction.feePayer = subscriber;
    transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Suscripción al Tier ${tier} en proceso...`,
      },
    });

    return Response.json(payload, { headers: SHARED_HEADERS });

  } catch (err: any) {
    console.error("Error en SolanaTiers Blink:", err);
    return Response.json({ 
      error: "Error al interactuar con el contrato. ¿Está inicializado el creador?" 
    }, { 
      status: 400, 
      headers: SHARED_HEADERS 
    });
  }
};