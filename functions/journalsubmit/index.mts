import 'dotenv/config';
import type { Handler } from "@netlify/functions";
import Airtable from 'airtable';
import {UploadApiResponse, v2 as cloudinary} from 'cloudinary';
import fetch from "node-fetch";
import path from 'path';

const MAX_FILE_SIZE_IN_BYTES = 5 * 1000000; // 5 mb

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

  const layoutBlob = formData.get('journallayout') as Blob;
  if (!layoutBlob) {
    console.error('The layout image was missing from form data')
    return new Response(ERROR_BODY_MISSING_PARAM, { status: 400, headers})
  }

  const arrayBuffer = await layoutBlob.arrayBuffer();
  if (!arrayBuffer) {
    console.error('Could not make an array buffer')
    return new Response(ERROR_BODY_INVALID_PARAM, { status: 400, headers })
  }


  if (arrayBuffer.byteLength > MAX_FILE_SIZE_IN_BYTES) {
    console.error(`The file is too large at ${arrayBuffer.byteLength} bytes`);
    return new Response(ERROR_BODY_FILE_TOO_LARGE, { status: 400, headers})
  }

  const result = await uploadToCloudinary(arrayBuffer);
  const journalLayoutUrl = result?.url;
  if (!journalLayoutUrl) {
    console.error(`Cloudinary did not return a URL`, result);
    return new Response(ERROR_BODY_CLOUDINARY_FAIL, { status: 400, headers })
  }

  try {
    const record = await addToAirtable(journalLayoutUrl, formData);
    console.info(`record ${record.id} was saved successfully`);

    // UGLY
    const name = formData.get('name') as string | null;
    const email = formData.get('email') as string | null;
    const desc = formData.get('layoutdescription') as string | null || '';
    const social = formData.get('socialmedia') as string | null || '';
    const fileString = Buffer.from(arrayBuffer).toString('base64')
    
    const filename = getFileNameFromUrl(journalLayoutUrl);
    await sendSuccessEmail(email, name, social, desc, fileString, filename);

    return new Response(
      SUCCESS,
      {
        headers
      }
    )
  } catch (error) {
    console.error('airtable failure', error);
    return new Response(ERROR_BODY_AIRTABLE_FAIL, { status: 200, headers} )
  }
}

async function uploadToCloudinary(byteArrayBuffer: ArrayBuffer): Promise<UploadApiResponse|undefined> {
  const nodeBuffer = Buffer.from(byteArrayBuffer);
  console.info('Attempting to upload buffer of size', byteArrayBuffer.byteLength)
  return new Promise((resolve) => {
      cloudinary.uploader.upload_stream((error, uploadResult) => {
        return resolve(uploadResult);
      }).end(nodeBuffer);
  });
}

async function addToAirtable(journalLayoutUrl: string, formData: FormData) {
  const base = new Airtable({apiKey: process.env.AIRTABLE_TOKEN}).base('app0lWi3PvS2b7m6v');
  // lol so messy
  const name = formData.get('name') as string | null;
  const email = formData.get('email') as string | null;
  const desc = formData.get('layoutdescription') as string | null || '';
  const social = formData.get('socialmedia') as string | null || '';

  if (!name || name.trim().length === 0) {
    throw new Error(`Name ${name} is invalid`);
  }
  const emailRegExp =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

  if (!email || email.trim().length === 0 || !emailRegExp.test(email)) {
    throw new Error(`Email ${email} is invalid`);
  }

  const newRecord = {
    'Name': name,
    'Email': email,
    'Description': desc,
    'Social': social,
    'From': 'web'
  };
  if (journalLayoutUrl) {
    newRecord['Journal Layout'] = [{ 'url': journalLayoutUrl } as any]
  }
  return base('submissions').create(newRecord);
}




const sendSuccessEmail = async function(email, name, social, description, image, filename) {
  return fetch(`${process.env.URL}/.netlify/functions/emails/journalsuccess`, {
    headers: {
      "netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET as string,
    },
    method: "POST",
    body: JSON.stringify({
      from: 'hello@pouch.cafe',
      to: email,
      subject: "Thanks for submitting to Pouch",
      parameters: {
        name,
        email,
        social,
        description
      },
      attachments: [
        {
        content: image,
        filename,
      }
    ],
    }),
  });
};


function getFileNameFromUrl(urlString: string) {
  const parsed = new URL(urlString);
  return path.basename(parsed.pathname);
}