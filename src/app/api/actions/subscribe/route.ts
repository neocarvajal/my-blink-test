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
const MI_WALLET_CREADOR = new PublicKey("neoYtXTopQCbg2eWJhsT3uTTUJKCvnWwgC3NppJD1cS");
const MI_WALLET_REFERIDO = new PublicKey("8H8nCS6JUhKNJRHbC2fmr6ofHRLsYCapqVmb5CJJ6VE6");
const LOGO_URL = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

const SHARED_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "X-Action-Version": "1",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};

export const GET = async (req: Request) => {
  try {
    const payload: ActionGetResponse = {
      type: "action",
      icon: LOGO_URL,
      title: "SolanaTiers Protocol",
      description: "Suscríbete para apoyar al creador. Si ya eres miembro, puedes mejorar tu nivel pagando solo la diferencia.",
      label: "Suscribirse",
      links: {
        actions: [
          {
            type: "transaction",
            label: "Tier 1 (Plata)",
            href: `/api/actions/subscribe?tier=1&index=0&ref=${MI_WALLET_REFERIDO.toBase58()}`,
          },
          {
            type: "transaction",
            label: "Tier 2 (Oro)",
            href: `/api/actions/subscribe?tier=2&index=0&ref=${MI_WALLET_REFERIDO.toBase58()}`,
          }
        ]
      }
    };

    return Response.json(payload, { headers: SHARED_HEADERS });
  } catch (err) {
    return Response.json({ error: "Error loading action" }, { status: 500, headers: SHARED_HEADERS });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const body: ActionPostRequest = await req.json();
    
    const subscriber = new PublicKey(body.account);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const program = new Program(idl as Solanatiers, { connection });

    const tier = parseInt(searchParams.get("tier") || "1");
    const index = parseInt(searchParams.get("index") || "0");
    const referrerStr = searchParams.get("ref") || MI_WALLET_REFERIDO.toBase58();
    const referrer = new PublicKey(referrerStr);
    const subscriptionIndexBN = new BN(index);

    const [creatorConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator"), MI_WALLET_CREADOR.toBuffer()],
      PROGRAM_ID
    );

    const [userSubscriptionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        subscriber.toBuffer(),
        MI_WALLET_CREADOR.toBuffer(),
        subscriptionIndexBN.toArrayLike(Buffer, "le", 8)
      ],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(userSubscriptionPDA);
    let instruction;
    let message = "";

    if (!accountInfo) {
      instruction = await program.methods
        .subscribe(tier, subscriptionIndexBN)
        .accounts({
          creatorConfig: creatorConfigPDA,
          userSubscription: userSubscriptionPDA,
          subscriber: subscriber,
          creator: MI_WALLET_CREADOR,
          referrer: referrer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      message = `Activando suscripción Tier ${tier}...`;
    } else {
      const currentState: any = await (program.account as any ).userSubscription.fetch(userSubscriptionPDA);
      
      if (currentState.tier >= tier) {
        return Response.json({ 
          error: `Ya posees el Tier ${currentState.tier} o uno superior.` 
        }, { status: 400, headers: SHARED_HEADERS });
      }

      instruction = await program.methods
        .upgradeTier(tier, subscriptionIndexBN)
        .accounts({
          creatorConfig: creatorConfigPDA,
          userSubscription: userSubscriptionPDA,
          subscriber: subscriber,
          creator: MI_WALLET_CREADOR,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      message = `Mejorando nivel al Tier ${tier}...`;
    }

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = subscriber;
    transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: message,
      },
    });

    return Response.json(payload, { headers: SHARED_HEADERS });

  } catch (err: any) {
    console.error("Error en POST:", err);
    return Response.json({ 
      error: "Error al procesar la transacción." 
    }, { 
      status: 400, 
      headers: SHARED_HEADERS 
    });
  }
};