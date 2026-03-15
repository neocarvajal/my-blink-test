import { createActionHeaders, type ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // Mapea la raíz a tu API de suscripción
      {
        pathPattern: "/",
        apiPath: "/api/actions/subscribe",
      },
      // Mapea cualquier subruta de acciones
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
    ],
  };

  return Response.json(payload, {
    headers: createActionHeaders(),
  });
};

export const OPTIONS = GET;