import { ACTIONS_CORS_HEADERS } from "@solana/actions";

export const GET = async () => {
  return Response.json(
    {
      rules: [
        // Esta regla dice: "Si alguien visita /subscribe, 
        // usa la lógica de mi API en /api/actions/subscribe"
        {
          pathPattern: "/subscribe",
          apiPath: "/api/actions/subscribe",
        },
        // Regla comodín para atrapar cualquier otra acción en tu API
        {
          pathPattern: "/api/actions/**",
          apiPath: "/api/actions/**",
        },
      ],
    },
    {
      headers: ACTIONS_CORS_HEADERS,
    }
  );
};

// Necesario para que las peticiones de otros dominios no sean bloqueadas
export const OPTIONS = GET;