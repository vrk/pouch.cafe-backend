import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  const response = {
    msg: "hello world"
  };
  return new Response(
    JSON.stringify(response),
    {
      headers: {
        "access-control-allow-origin": "*",
      }
    }
  )
}

