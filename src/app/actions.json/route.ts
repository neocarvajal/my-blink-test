import { createActionHeaders, type ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // Esta regla le dice a Dial.to: 
      // "Cualquier petición a la raíz, mándala a mi API de suscripción"
      {
        pathPattern: "/",
        apiPath: "/api/actions/subscribe",
      },
    ],
  };

  return Response.json(payload, {
    headers: createActionHeaders(),
  });
};

export const OPTIONS = GET;