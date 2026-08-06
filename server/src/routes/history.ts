import { Router } from 'express';
import {saveTherapistNote, saveWritingSample, getTherapistNotes, getWritingSamples, getWritingSamples2} from '../db/history';
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
			let retVal = [
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			]
			const createdAt: string = sample.createdAt;

			for (let i = 0; i < sample.analysis.errors.length; i++) {
				let f: number;
				const error = sample.analysis.errors[i];
				switch (error.category) {
					case 'phonological': f = 0; break;
					case 'orthographic': f = 1; break;
					case 'morphological': f = 2; break;
					case 'grammar': f = 3; break;
					case 'other': f = 4; break;
					default:
						console.warn(`Unknown error category: ${error.category}`);
						continue; // or f = 4 to bucket into "other"
				}
				switch (error.severity) {
					case "low": retVal[f][0]++; break;
					case "medium": retVal[f][1]++; break;
					case "high": retVal[f][2]++; break;
					default:
						console.warn(`Unknown error severity "${error.severity}" for student ${studentId}, sample created ${createdAt}`);
				}
			}
			
			return {
				wordCount: sample.sampleText ? (sample.sampleText.match(/\b\w+\b/g) || []).length : 0,
				createdAt,
				summary: retVal
			} as SummaryItem;
		});

		// find most effective recommendations
		const weightage = (triple: number[]) => triple[0] * 1 + triple[1] * 2 + triple[2] * 3;
		const delta = (s: SummaryItem, f: SummaryItem) => {
			const weight_s = (weightage(s.summary[0]) + weightage(s.summary[1]) + weightage(s.summary[2]) + weightage(s.summary[3]) + weightage(s.summary[4])) / s.wordCount;
			const weight_f = (weightage(f.summary[0]) + weightage(f.summary[1]) + weightage(f.summary[2]) + weightage(f.summary[3]) + weightage(f.summary[4])) / f.wordCount;
			return weight_s === 0 ? (weight_f === 0 ? 0 : 100) : Math.round(((weight_f - weight_s) / weight_s) * 100);
		}
		const length = samples.length;
		
		let recList: { rec: Recommendation[], d: number }[] = [];
		for (let i: number = 0; i < length-1; i++) {
			const rec = samples[i].recommendations;
			const d = delta(summary[i], summary[i+1]);
			recList.push({ rec, d });
		}
		recList.sort((a, b) => b.d - a.d);

		const recommendationsRanking: Recommendation[] = recList.map(item => item.rec).flat();
		res.json({ status: 'ok', summary, recommendationsRanking });
		
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
});

router.get("/getanalysis/:studentId", async (req, res) => {
	const studentId = req.params.studentId;
	if (!studentId) {
		res.status(400).json({ error: "No student ID was provided." });
	} else {
		const rows = await getWritingSamples2(studentId);
		const returnVal = rows.map((row: any) => row.ai_analysis);
		res.json(returnVal);}
});

router.get("/cohort-average", async (req, res) => {
	const averages = await getCohortAverages();
	res.json(averages);
});

export default router;
