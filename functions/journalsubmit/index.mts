import 'dotenv/config';
import type { Context } from "@netlify/functions"
import Airtable from 'airtable';
import {UploadApiResponse, v2 as cloudinary} from 'cloudinary';
          
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
  
  console.log(headers);
  // const json = await req.json();
  const formData = await req.formData();
  console.log(formData);
  const layoutBlob = formData.get('journallayout') as Blob;
  const response = {
    msg: "hi hello world",
    // received: json
  };

  console.log('hello here')
  console.log(process.env.AIRTABLE_TOKEN);
  const arrayBuffer = await layoutBlob.arrayBuffer();
  const result = await uploadToCloudinary(arrayBuffer);
  console.log(result?.url);
  await addToAirtable(result?.url);
  
  return new Response(
    JSON.stringify(response),
    {
      headers
    }
  )
}

async function uploadToCloudinary(byteArrayBuffer: ArrayBuffer): Promise<UploadApiResponse|undefined> {
  const nodeBuffer = Buffer.from(byteArrayBuffer);
  return new Promise((resolve) => {
      cloudinary.uploader.upload_stream((error, uploadResult) => {
          return resolve(uploadResult);
      }).end(nodeBuffer);
  });
}

async function addToAirtable(journalLayoutUrl) {
  const base = new Airtable({apiKey: process.env.AIRTABLE_TOKEN}).base('app0lWi3PvS2b7m6v');
  const newRecord = {
    'Name': 'vrk',
    'Email': 'victoriakirst@gmail.com',
    'Description': "doing goood!",
    'Stationery Used': 'ya',
    'Social': 'hiii'
  };
  if (journalLayoutUrl) {
    newRecord['Journal Layout'] = [{ 'url': journalLayoutUrl } as any]
  }
  try {
    const recorded = base('submissions').create(newRecord);
    console.log(recorded);
  } catch (error) {
    console.error('error adding to airtable', error);
  }
}