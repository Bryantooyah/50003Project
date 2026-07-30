import OpenAI from "openai";
import { Router } from "express";
import dotenv from "dotenv";
import { getStudentAnalysis } from "../db/analysis";

dotenv.config();

const router = Router();

function getOpenAIClient() {
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

async function createSimpleResponse(input: string) {
  const { client, model } = getOpenAIClient();

  const output = await client.responses.create({
    model,
    instructions:
      "You are analysing a student's writing sample. Identify spelling, grammar, phonological, orthographic, and morphological issues clearly.",
    input,
  });

  return output.output_text;
}

router.post("/", async (req, res, next) => {
  try {
    const text = req.body.text;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required." });
    }

    const outputText = await createSimpleResponse(text);

    return res.status(200).json({ output: outputText });
  } catch (err) {
    next(err);
  }
});

router.get("/getanalysis/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  if (!studentId) {
    res.status(400).json({ error: "No student ID was provided." });
  } else {
  const rows = await getStudentAnalysis(studentId);
  res.json(rows);}
});

export default router;