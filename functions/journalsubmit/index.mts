import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  console.log("oh hello world");
  const json = await req.json();
  console.log(json);
  const response = {
    msg: "hi hello world",
    received: json
  };
  return new Response(
    JSON.stringify(response),
    {
      headers: {
        "access-control-allow-origin": "https://pouch.cafe",
      }
    }
  )
}

