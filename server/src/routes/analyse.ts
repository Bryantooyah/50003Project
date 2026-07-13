import OpenAI from "openai";
import Router from 'express';

const router = Router();

const client = new OpenAI({
	baseURL: process.env['OPENAI_BASE_URL'],
	apiKey: process.env['OPENAI_API_KEY']
});

const model = process.env['MODEL'];

const createSimpleResponse = async (input: string) => {
	let output = await client.responses.create({
		model: model,
		instructions: 'Look at the input and answer accordingly.',
		input: input
	});
	return output.output_text;
};

router.post('/', async (req, res, next) => {
	console.log(req.body);
	const id = req.body.id;
	const text = req.body.text;
	const output_text = await createSimpleResponse(text);
	console.log(output_text);
	return res.status(200).json({ output: output_text });
})

export default router;