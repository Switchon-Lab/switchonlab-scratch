import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styles from './roadmap-modal.css';

const LESSONS = [
    {no: 1, label: 'L1', title: 'りんごを\n表示しよう'},
    {no: 2, label: 'L2', title: 'りんごを\n落とそう'},
    {no: 3, label: 'L3', title: 'カゴを\n動かそう'},
    {no: 4, label: 'L4', title: 'スコアを\nつけよう'},
    {no: 5, label: 'L5', title: '効果音を\nつけよう'},
    {no: 6, label: 'L6', title: 'タイトルを\n作ろう'},
    {no: 7, label: 'L7', title: 'ゲームオーバー\nを作ろう'},
    {no: 8, label: 'L8', title: '仕上げを\nしよう'}
];

const handleStopPropagation = e => e.stopPropagation();

const RoadmapModal = ({currentLessonNo, onClose}) => ReactDOM.createPortal(
    <div
        className={styles.overlay}
        onClick={onClose}
    >
        <div
            className={styles.modal}
            onClick={handleStopPropagation}
        >
            <div className={styles.header}>
                <span>{`🎉 L${currentLessonNo} クリア！`}</span>
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                >
                    {'✕'}
                </button>
            </div>
            <div className={styles.body}>
                <div className={styles.roadmap}>
                    {LESSONS.map((lesson, idx) => {
                        const isDone = lesson.no < currentLessonNo;
                        const isCurrent = lesson.no === currentLessonNo;
                        const cardClass = isDone ? styles.cardDone :
                            isCurrent ? styles.cardCurrent :
                                styles.cardTodo;
                        return (
                            <React.Fragment key={lesson.no}>
                                <div className={cardClass}>
                                    <div className={styles.cardBadge}>
                                        {isDone ? '✓' : isCurrent ? '👑' : ''}
                                    </div>
                                    <div className={styles.cardLabel}>{lesson.label}</div>
                                    <div className={styles.cardTitle}>
                                        {lesson.title.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < lesson.title.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {idx < LESSONS.length - 1 && (
                                    <div className={styles.arrow}>{'→'}</div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className={styles.guide}>
                    {'次のレッスンに進むには、画面下の'}
                    <br />
                    <strong>{'「理解しました」'}</strong>
                    {'ボタンをクリックしてください！'}
                </div>
            </div>
        </div>
    </div>,
    document.body
);

RoadmapModal.propTypes = {
    currentLessonNo: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired
};

export default RoadmapModal;
