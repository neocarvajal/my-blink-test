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
const PROGRAM_ID = new PublicKey("4NQ9RtQ3EYENFzb8qRN6ya3uYCmABKMNjgYfghBRWP4K"); 
const MI_WALLET_CREADOR = new PublicKey("neoYtXTopQCbg2eWJhsT3uTTUJKCvnWwgC3NppJD1cS");
const MI_WALLET_REFERIDO = new PublicKey("8H8nCS6JUhKNJRHbC2fmr6ofHRLsYCapqVmb5CJJ6VE6");
const BANNER_URL = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"; 

const SHARED_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "X-Action-Version": "2.1",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids"
};

export const GET = async (req: Request) => {

  const requestUrl = new URL(req.url);
 
  const baseHref = new URL(
    "/api/actions/subscribe",
    requestUrl.origin
  ).toString();

  const payload: ActionGetResponse = {
    type: "action",
    icon: BANNER_URL,
    title: "SolanaTiers Protocol",
    description: "Support your favorite creators. Upgrade anytime by paying only the difference!",
    label: "Subscribe",
    links: {
      actions: [
        { 
          type: "transaction",
          label: "Tier 1: Starter", 
          href: `${baseHref}?tier=1&index=0` 
        },
        { 
          type: "transaction",
          label: "Tier 2: Pro", 
          href: `${baseHref}?tier=2&index=0` 
        },
        { 
          type: "transaction",
          label: "Tier 3: Elite", 
          href: `${baseHref}?tier=3&index=0` 
        },
        { 
          type: "transaction",
          label: "Tier 4: VIP", 
          href: `${baseHref}?tier=4&index=0` 
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
    
    const subscriber = new PublicKey(body.account);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const program = new Program(idl as Solanatiers, { connection });

    const tier = parseInt(searchParams.get("tier") || "1");
    const index = parseInt(searchParams.get("index") || "0");
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

    const accountInfo = await connection.getAccountInfo(userSubscriptionPDA, "processed");
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
          referrer: MI_WALLET_REFERIDO,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      message = `Subscribing to Tier ${tier}...`;
    } else {
      const currentState: any = await (program.account as any).userSubscription.fetch(userSubscriptionPDA);
      
      if (currentState.tier === tier) {
        return Response.json({ error: `You are already Tier ${tier}!` }, { status: 400, headers: SHARED_HEADERS });
      }

      if (currentState.tier > tier) {
        return Response.json({ error: `You already have a higher level (Tier ${currentState.tier}).` }, { status: 400, headers: SHARED_HEADERS });
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
      message = `Upgrading from Tier ${currentState.tier} to Tier ${tier}...`;
    }

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = subscriber;
    transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message,
      },
    });

    return Response.json(payload, { headers: SHARED_HEADERS });

  } catch (err: any) {
    return Response.json({ 
      error: "Transaction failed. Please check your balance or current tier level." 
    }, { status: 400, headers: SHARED_HEADERS });
  }
};