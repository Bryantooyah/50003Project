/**
 * spellChecker.ts
 *
 * A spell checker built for large dictionaries.
 *
 * Design:
 * - Exact-match checks use a `Set<string>` -> O(1) average lookup.
 * - Suggestions use a BK-tree (Burkhard-Keller tree) keyed on Levenshtein
 * distance. A BK-tree lets us find all dictionary words within an edit
 * distance `d` of a query WITHOUT scanning all 262k words: the triangle
 * inequality prunes most of the tree, so a typical lookup only touches a
 * small fraction of nodes (empirically O(log n) - O(sqrt n) touched
 * nodes, vs. O(n) for a brute-force scan).
 * - The Levenshtein distance function is an iterative, two-row DP
 * (O(min(len_a, len_b)) space instead of O(len_a * len_b)) with an
 * early-exit ("banded") cutoff once the best possible distance in a row
 * already exceeds the threshold we care about.
 *
 * Build cost: O(n * avg_word_len^2) one-time, at startup.
 * Query cost: O(1) for isCorrect(); sub-linear (typically) for suggestions.
 */

const wordList = require("../assets/words.json"); // word list
const words: string[] = wordList.words;
const wLength: number = wordList.size;

// === Optimised Levenshtein distance ===

/**
 * Computes the Levenshtein edit distance between `a` and `b`.
 *
 * `maxDistance` acts as a cap: if the true distance is guaranteed to exceed
 * it, the function may return `maxDistance + 1` instead of the exact value
 * (this lets callers prune early without paying for the full DP table).
 * Pass a cap >= max(a.length, b.length) to always get the exact distance.
 */
function levenshtein(a: string, b: string, maxDistance: number): number {
	let sa = a;
	let sb = b;

	// Ensure sb is the shorter string so our row is as small as possible.
	if (sa.length < sb.length) {
		const tmp = sa;
		sa = sb;
		sb = tmp;
	}

	const aLen = sa.length;
	const bLen = sb.length;

	if (aLen - bLen > maxDistance) return maxDistance + 1;
	if (aLen === 0) return bLen;
	if (bLen === 0) return aLen;
	if (sa === sb) return 0;

	let prevRow = new Uint16Array(bLen + 1);
	let currRow = new Uint16Array(bLen + 1);
	for (let j = 0; j <= bLen; j++) prevRow[j] = j;

	for (let i = 1; i <= aLen; i++) {
		currRow[0] = i;
		let rowMin = currRow[0];
		const aChar = sa.charCodeAt(i - 1);

		for (let j = 1; j <= bLen; j++) {
			const cost = aChar === sb.charCodeAt(j - 1) ? 0 : 1;
			const deletion = prevRow[j] + 1;
			const insertion = currRow[j - 1] + 1;
			const substitution = prevRow[j - 1] + cost;

			let best = deletion < insertion ? deletion : insertion;
			if (substitution < best) best = substitution;

			currRow[j] = best;
			if (best < rowMin) rowMin = best;
		}

		// Banded early exit: if even the best value in this row already exceeds maxDistance, the final distance will too.
		if (rowMin > maxDistance) return maxDistance + 1;

		const tmp = prevRow;
		prevRow = currRow;
		currRow = tmp;
	}

	return prevRow[bLen];
}

// === BK-tree ===

interface BKNode {
word: string;
children: Map<number, BKNode>;
}

export interface SuggestionMatch {
word: string;
distance: number;
}

class BKTree {
	private root: BKNode | null = null;

	insert(word: string): void {
		if (!this.root) {
			this.root = { word, children: new Map() };
			return;
		}

		let node = this.root;
		for (;;) {
			const cap = Math.max(word.length, node.word.length);
			const d = levenshtein(word, node.word, cap);

			if (d === 0) return; // duplicate word, nothing to insert

			const child = node.children.get(d);
			if (!child) {
				node.children.set(d, { word, children: new Map() });
				return;
			}
			node = child;
		}
	}

	/**
	 * Returns all words within `maxDistance` of `query`, sorted by distance
	 * (then alphabetically), limited to `limit` results.
	 */
	search(query: string, maxDistance: number, limit: number): SuggestionMatch[] {
		if (!this.root) return [];

		const found: SuggestionMatch[] = [];
		const stack: BKNode[] = [this.root];

		while (stack.length > 0) {
			const node = stack.pop() as BKNode;

			// Need the exact distance here (not the banded/capped version) so the
			// triangle-inequality pruning below stays correct.
			const cap = Math.max(query.length, node.word.length);
			const d = levenshtein(query, node.word, cap);

			if (d <= maxDistance) found.push({ word: node.word, distance: d });

			const lo = d - maxDistance;
			const hi = d + maxDistance;
			for (const [edgeDist, child] of node.children) {
				if (edgeDist >= lo && edgeDist <= hi) stack.push(child);
			}
		}

		found.sort((x, y) => x.distance - y.distance || x.word.localeCompare(y.word));
		return found.slice(0, limit);
	}
}

// === Spell checker ===

export interface SpellCheckerOptions {
	/** Default max edit distance used by getSuggestions/check(). Default: 2 */
	defaultMaxDistance?: number;
	/** Default number of suggestions returned. Default: 10 */
	defaultLimit?: number;
}

export class SpellChecker {
	private readonly wordSet: Set<string>;
	private readonly tree: BKTree;
	private readonly defaultMaxDistance: number;
	private readonly defaultLimit: number;

	constructor(dictionary: string[], options: SpellCheckerOptions = {}) {
		this.wordSet = new Set(dictionary);
		this.tree = new BKTree();
		for (let i = 0; i < dictionary.length; i++) {
			this.tree.insert(dictionary[i]);
		}
		this.defaultMaxDistance = options.defaultMaxDistance ?? 2;
		this.defaultLimit = options.defaultLimit ?? 10;
	}

	/** O(1) average - is `word` spelled correctly? */
	isCorrect(word: string): boolean {
		return this.wordSet.has(word.toLowerCase());
	}

	/**
	 * Returns spelling suggestions for `word`, closest matches first.
	 * Returns `[word]` immediately if the word is already correct.
	 *
	 * Progressively widens the search radius (1, 2, ..., maxDistance) so
	 * cheap, common typos (distance 1) don't pay for a distance-2 search.
	 */
	getSuggestions(
			word: string,
			maxDistance: number = this.defaultMaxDistance,
			limit: number = this.defaultLimit
			): string[] {
		const lower = word.toLowerCase();
		if (this.wordSet.has(lower)) return [lower];

		for (let d = 1; d <= maxDistance; d++) {
			const matches = this.tree.search(lower, d, limit);
			if (matches.length > 0) return matches.map((m) => m.word);
		}
		return [];
	}

	/**
	 * Convenience helper combining both checks: tells you whether a word is
	 * correct, and if not, offers suggestions.
	 */
	check(
			word: string,
			maxDistance: number = this.defaultMaxDistance,
			limit: number = this.defaultLimit
		 ): {correct: boolean; suggestions: string[]} // returns custom object
	{
		if (this.isCorrect(word)) return { correct: true, suggestions: [] };
		return {
correct: false,
		 suggestions: this.getSuggestions(word, maxDistance, limit)
		};
	}
}

if (words.length !== wLength) {
	// Not fatal, but worth knowing if the JSON's declared size drifts from the actual array length.
	console.warn(
			`words.json size mismatch: declared ${wLength}, actual ${words.length}`
			);
}

const spellChecker = new SpellChecker(words);

export function isWordCorrect(word: string): boolean {
	return spellChecker.isCorrect(word);
}

export function getSuggestions(word: string, maxDistance?: number, limit?: number): string[] {
	return spellChecker.getSuggestions(word, maxDistance, limit);
}

export function checkWord(word: string, maxDistance?: number, limit?: number) {
	return spellChecker.check(word, maxDistance, limit);
}

export default spellChecker;
