import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  const headers = (process.env.NETLIFY_DEV) ? {
    "access-control-allow-origin": "http://localhost:8080",
  }: {
    "access-control-allow-origin": "https://pouch.cafe",
  };
  
  const json = await req.json();
  console.log(json);
  const response = {
    msg: "hi hello world",
    received: json
  };
  
  return new Response(
    JSON.stringify(response),
    {
      headers
    }
  )
}

