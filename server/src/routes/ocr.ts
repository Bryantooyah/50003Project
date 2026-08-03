import { Router } from "express";
import dotenv from "dotenv";
import { getOpenAIClient } from "./analyse";

dotenv.config();

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "imageBase64 and mimeType are required." });
    }

    const { client, model } = getOpenAIClient();

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You transcribe handwritten student writing samples exactly as written, including spelling and grammar errors. Do not correct, interpret, or clean up the text — transcribe it verbatim. Return only the transcribed text, nothing else.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Transcribe this handwritten writing sample exactly as written." },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        },
      ],
    });

    return res.status(200).json({ text: response.output_text ?? "" });
  } catch (err) {
    next(err);
  }
});

export default router;