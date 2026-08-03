import OpenAI from "openai";
import { Router } from "express";
import dotenv from "dotenv";
import { zodTextFormat } from "openai/helpers/zod";
import { LLMOutput, llmOutputSchema } from "../types";

dotenv.config();

const router = Router();

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.MODEL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing from server/.env");
  }

  if (!model) {
    throw new Error("MODEL is missing from server/.env");
  }

  return {
    client: new OpenAI({
      baseURL,
      apiKey,
    }),
    model,
  };
}

async function createSimpleResponse(input: string): Promise<LLMOutput|null> {
  const { client, model } = getOpenAIClient();

  const response = await client.responses.parse({
    model: model,
    input: [
      { role: "system", content: "You are analysing a student's writing sample. Identify spelling, grammar, phonological, orthographic, and morphological issues clearly." },
      {role: "user", content: input }
    ],
    text: {
      format: zodTextFormat(llmOutputSchema, "writing_sample_analysis")
    }
  });

  console.log(response.output_parsed);
  return response.output_parsed as (LLMOutput | null);
}

router.post("/", async (req, res, next) => {
  try {
    const text = req.body.text;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required." });
    }

    const outputJson: LLMOutput | null = await createSimpleResponse(text);

    return outputJson == null ? res.status(503).json({error: "The LLM died while processing your request"}) : res.status(200).json(outputJson);
  } catch (err) {
    next(err);
  }
});

export default router;