import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import styles from './WeeklyQuests.module.css';

function WeeklyQuests() {
    const [quests, setQuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuests = async () => {
            try {
                const response = await axiosInstance.get('/api/quests/weekly');
                setQuests(response.data);
            } catch (err) {
                setError('주간 퀘스트를 불러오는 데 실패했습니다.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuests();
    }, []);

    if (loading) {
        return <div className={styles.loading}>로딩 중...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.questsContainer}>
            <h2>주간 퀘스트</h2>
            {quests.length === 0 ? (
                <p>진행 가능한 주간 퀘스트가 없습니다.</p>
            ) : (
                <ul className={styles.questList}>
                    {quests.map(quest => (
                        <li key={quest._id} className={styles.questItem}>
                            <h3>{quest.title}</h3>
                            <p>{quest.description}</p>
                            <div className={styles.progressContainer}>
                                <progress 
                                    className={styles.progressBar}
                                    value={quest.user_progress.progress}
                                    max={quest.goal}>
                                </progress>
                                <span>{quest.user_progress.progress} / {quest.goal}</span>
                            </div>
                            {quest.user_progress.status === 'completed' && 
                                <span className={styles.completed}>완료!</span>
                            }
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default WeeklyQuests;
