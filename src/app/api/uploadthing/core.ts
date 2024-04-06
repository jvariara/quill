import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { getPineconeClient } from "@/lib/pinecone";
import {PineconeStore} from "langchain/vectorstores/pinecone"
import {OpenAIEmbeddings} from "langchain/embeddings/openai"
 
const f = createUploadthing();
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const {getUser} = getKindeServerSession()
      const user = getUser() 
    
      if(!user || !user.id) throw new Error("Unauthorized")
    // returns to the metadata in onUploadComplete
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: file.url,
          uploadStatus: "PROCESSING"
        }
      })

      // index the pdf file
      try {
        const response = await fetch(file.url)
        const blob = await response.blob()

        const loader = new PDFLoader(blob)
    
        const pageLevelDocs = await loader.load()

        // each elem is a page
        const pagesAmt = pageLevelDocs.length

        // vectorize and index entire document
        const pinecone = await getPineconeClient()
        const pineconeIndex = pinecone.Index('quill')

        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        })

        await PineconeStore.fromDocuments(
          pageLevelDocs,
          embeddings,
          {
            pineconeIndex,
            namespace: createdFile.id,
          }
        )

        await db.file.update({
          data: {
            uploadStatus: 'SUCCESS',
          },
          where: {
            id: createdFile.id,
          },
        })
      } catch (error) {
        console.log(error)
        await db.file.update({
          data: {
            uploadStatus: "FAILED"
          },
          where: {
            id: createdFile.id
          }
        })
      }
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;