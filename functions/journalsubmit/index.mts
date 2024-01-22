import 'dotenv/config';
import type { Context } from "@netlify/functions"
import Airtable from 'airtable';
import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET 
});

export default async (req: Request, context: Context) => {
  const headers = (process.env.DEVMODE) ? {
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

  console.log('hello here')
  console.log(process.env.AIRTABLE_TOKEN);
  await addToAirtable();
  
  return new Response(
    JSON.stringify(response),
    {
      headers
    }
  )
}

async function uploadToCloudinary() {
  
}

async function addToAirtable() {
  const base = new Airtable({apiKey: process.env.AIRTABLE_TOKEN}).base('app0lWi3PvS2b7m6v');
  try {
    const record = base('submissions').create({
      'Name': 'vrk',
      'Email': 'victoriakirst@gmail.com',
      'Journal Layout': [{ 'url': 'https://pouch.cafe/images/cover.png' } as any],
      'Description': "doing goood!",
      'Stationery Used': 'ya',
      'Social': 'hiii'
    });
    console.log(record);
  } catch (error) {
    console.error('error adding to airtable', error);
  }
}