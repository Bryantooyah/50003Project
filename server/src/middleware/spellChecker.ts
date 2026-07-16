const wordList = require("../assets/words.json");  // word list
const words: string[] = wordList.words;
const wLength: number = wordList.size;

function findWord (word: string): number {
    let s_idx = 0;
    let e_idx = wLength - 1;
    let m_idx = 0;
    
    while (s_idx <= e_idx) {
        m_idx = s_idx + ((e_idx - s_idx) >> 1);
        
        if (words[m_idx] === word)
            return 0;
        if (words[m_idx] > word)
            e_idx = m_idx - 1;
        else
            s_idx = m_idx + 1;
    }
    
    m_idx = Math.max(0, Math.min(m_idx, wLength - 1));
    
    return distance(word, words[m_idx]);
}

function distance (s: string, t: string): number {
	// Ensure `t` is the shorter string to minimize array allocation space
    if (s.length < t.length) {
        [s, t] = [t, s];
    }

    const m = s.length;
    const n = t.length;

    // Handle edge cases where one string is empty
    if (n === 0) return m;

    // Use a single typed array for better performance
    const v = new Int32Array(n + 1);

    // Initialize the vector
    for (let j = 0; j <= n; j++) {
        v[j] = j;
    }

    for (let i = 0; i < m; i++) {
        let prevDiagonal = v[0]; // Stores the top-left value: A[i][j]
        v[0] = i + 1;            // Current row's first element: A[i+1][0]

        for (let j = 0; j < n; j++) {
            const nextDiagonal = v[j + 1]; // Save before it gets overwritten
            
            // If characters match, cost is 0, else 1
            const cost = s[i] === t[j] ? 0 : 1;

            // v[j + 1] (deletion), v[j] (insertion), prevDiagonal + cost (substitution)
            v[j + 1] = Math.min(
                v[j + 1] + 1,        
                v[j] + 1,            
                prevDiagonal + cost  
            );

            prevDiagonal = nextDiagonal; // Slide the diagonal value forward
        }
    }
    return v[n];	
}

console.log(findWord("hello"));
console.log(findWord("hellp"));
