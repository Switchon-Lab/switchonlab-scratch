import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styles from './roadmap-modal.css';

const handleStopPropagation = e => e.stopPropagation();

const RoadmapModal = ({lessons, currentLessonNo, onClose}) => ReactDOM.createPortal(
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
                    {lessons.map((lesson, idx) => {
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
                                {idx < lessons.length - 1 && (
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
    lessons: PropTypes.arrayOf(PropTypes.shape({
        no: PropTypes.number.isRequired,
        label: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired
    })).isRequired,
    currentLessonNo: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired
};

export default RoadmapModal;
