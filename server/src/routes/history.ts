import { Router } from 'express';
import {saveTherapistNote, saveWritingSample, getTherapistNotes, getWritingSamples} from '../db/history';
import { AnalysisResult, Recommendation, SummaryItem, TherapistNote, WritingSample } from '../types';
import { getCohortAverages } from '../db/history';

const router = Router();

router.post('/save', async (req, res, next) => {
	try {
		const therapistId: string = req.body.therapistId;
		const analysis: AnalysisResult = req.body.analysis;
		const recommendations: Recommendation[] = req.body.recommendations;
		const feedback: string = req.body.feedback;
		
		const studentId = analysis.studentId;
		const sampleText = analysis.sampleText;

		const saved = await saveWritingSample(
			therapistId,
			studentId,
			sampleText,
			analysis,
			recommendations,
			feedback
		);

		res.status(200).json({ status: 'ok', sample: saved });
	} catch (err) {
		next(err);
	}
});

router.get('/get/:studentId', async (req, res) => {
	try {
		const studentId = req.params.studentId;
		const samples: WritingSample[] = await getWritingSamples(studentId);
		const notes: TherapistNote[] = await getTherapistNotes(studentId);

		const summary: SummaryItem[] = samples.map(sample => {
			
			let f: number = 4;
			let retVal = [
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			]
			const createdAt: string = (sample as any).created_at;
			const errors = (sample as any).ai_analysis?.errors ?? [];
			for (let i = 0; i < errors.length; i++) {
				const error = errors[i];
				switch (error.category) {
					case 'phonological': f = 0; break;
					case 'orthographic': f = 1; break;
					case 'morphological': f = 2; break;
					case 'grammar': f = 3; break;
					case 'other': f = 4; break;
				}
				switch (error.severity) {
					case "low": retVal[f][0]++; break;
					case "medium": retVal[f][1]++; break;
					case "high": retVal[f][2]++; break;
				}
			}
			return {createdAt, summary: retVal} as SummaryItem;
		});

		res.json({ status: 'ok', summary })
		
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
});
router.get("/getanalysis/:studentId", async (req, res) => {
	const studentId = req.params.studentId;
	if (!studentId) {
		res.status(400).json({ error: "No student ID was provided." });
	} else {
		const rows = await getWritingSamples(studentId);
		console.log(rows)
		const returnVal = rows.map((row: any) => row.ai_analysis);
		console.log(returnVal)
		res.json(returnVal);}
});

router.get("/cohort-average", async (req, res) => {
	const averages = await getCohortAverages();
	res.json(averages);
});

export default router;