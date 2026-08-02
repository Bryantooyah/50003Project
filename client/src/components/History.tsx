import type { Student, SummaryItem } from "../types";
import { useState, useEffect } from 'react';
import { getHistory } from "../services/api";

function getStudent(students: Student[], studentId: string): Student | null {
	for (const student of students) {
		if (student.id === studentId) {
			return student;
		}
	}
	return null;
}

interface HistoryProps {
  students: Student[];
  selectedStudentId: string;
}

export default function History({ students, selectedStudentId }: HistoryProps) {
    const [historyItems, setHistoryItems] = useState<SummaryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const student = getStudent(students, selectedStudentId);

    useEffect(() => {
        if (selectedStudentId === "" || student === null) {
            setHistoryItems([]);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        getHistory(student.id)
            .then((data) => {
                if (isMounted) {
                    setHistoryItems(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || "An error occurred");
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [selectedStudentId, student]);

    if (selectedStudentId === "" || student === null) {
        return <h2 className="card">No student selected</h2>;
    }

    if (loading) {
        return <div className="card">Loading history...</div>;
    }

    if (error) {
        return <div className="card">Error: {error}</div>;
    }

    return (
        <div className="card">
            <h2>{student.name}</h2>
            {historyItems.length === 0 ? (
                <p>No history available.</p>
            ) : (
                historyItems.map((item, index) => (
                    <div key={index} className="history-item" style={{ marginTop: '20px' }}>
                        <h4>Date: {new Date(item.createdAt).toLocaleString()}</h4>
                        <table border={1} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                            <tbody>
                                {item.summary.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} style={{ padding: '8px' }}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </div>
    );
}
