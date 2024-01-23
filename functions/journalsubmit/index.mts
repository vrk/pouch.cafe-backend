import 'dotenv/config';
import type { Context } from "@netlify/functions"
import Airtable from 'airtable';
import {UploadApiResponse, v2 as cloudinary} from 'cloudinary';

const MAX_FILE_SIZE_IN_BYTES = 10000000; // 10 mb

const ERROR_BODY_MISSING_PARAM = JSON.stringify({error: "missingparam"});
const ERROR_BODY_INVALID_PARAM = JSON.stringify({error: "invalidparam"});
const ERROR_BODY_FILE_TOO_LARGE = JSON.stringify({error: "toolarge"});
const ERROR_BODY_CLOUDINARY_FAIL = JSON.stringify({error: "cloudinary"});
const ERROR_BODY_AIRTABLE_FAIL = JSON.stringify({error: "airtable"});
const SUCCESS = JSON.stringify({message: "success"});

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET 
});

const headers = (process.env.DEVMODE) ? {
  "access-control-allow-origin": "http://localhost:8080",
}: {
  "access-control-allow-origin": "https://pouch.cafe",
};

export default async (req: Request) => {
  const formData = await req.formData();
  console.log(formData);

  const layoutBlob = formData.get('journallayout') as Blob;
  if (!layoutBlob) {
    return new Response(ERROR_BODY_MISSING_PARAM, { status: 400, headers})
  }

  const arrayBuffer = await layoutBlob.arrayBuffer();
  if (!arrayBuffer) {
    return new Response(ERROR_BODY_INVALID_PARAM, { status: 400, headers })
  }

  if (arrayBuffer.byteLength > MAX_FILE_SIZE_IN_BYTES) {
    return new Response(ERROR_BODY_FILE_TOO_LARGE, { status: 400, headers})
  }

  const result = await uploadToCloudinary(arrayBuffer);
  const journalLayoutUrl = result?.url;
  if (!journalLayoutUrl) {
    return new Response(ERROR_BODY_CLOUDINARY_FAIL, { status: 400, headers })
  }

  try {
    const record = await addToAirtable(journalLayoutUrl);
    console.log(record);
    return new Response(
      SUCCESS,
      {
        headers
      }
    )
  } catch (error) {
    console.error(error);
    return new Response(ERROR_BODY_AIRTABLE_FAIL, { status: 200, headers} )
  }
}

async function uploadToCloudinary(byteArrayBuffer: ArrayBuffer): Promise<UploadApiResponse|undefined> {
  const nodeBuffer = Buffer.from(byteArrayBuffer);
  return new Promise((resolve) => {
      cloudinary.uploader.upload_stream((error, uploadResult) => {
        return resolve(uploadResult);
      }).end(nodeBuffer);
  });
}

async function addToAirtable(journalLayoutUrl: string) {
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
  return base('submissions').create(newRecord);
}