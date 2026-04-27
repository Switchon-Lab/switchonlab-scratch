import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styles from './hint-modal.css';

const HintModal = ({title, hintImage, hintNote, navigatorImage, conceptText, headerColor, onClose}) => ReactDOM.createPortal(
    <div className={styles.overlay}>
        <div className={styles.modal}>
            <div
                className={styles.header}
                style={headerColor ? {backgroundColor: headerColor} : undefined}
            >
                <span>{title}</span>
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                >
                    {'✕'}
                </button>
            </div>

            <div className={styles.imageArea}>
                {hintImage ? (
                    <img
                        className={styles.hintImage}
                        src={`/hints/${hintImage}`}
                        alt="ヒント"
                    />
                ) : navigatorImage ? (
                    <img
                        className={styles.navigatorImage}
                        src={navigatorImage}
                        alt="キャラクター"
                    />
                ) : (
                    <div className={styles.placeholder}>
                        <span>{'💡'}</span>
                        <span className={styles.placeholderText}>{'画像準備中'}</span>
                    </div>
                )}
            </div>

            {hintNote && (
                <div className={styles.noteArea}>
                    {hintNote}
                </div>
            )}
            {conceptText && (
                <div className={styles.noteArea}>
                    {conceptText.split('\n').map((line, i) => (
                        <span key={i}>{line}<br /></span>
                    ))}
                </div>
            )}
        </div>
    </div>,
    document.body
);

HintModal.propTypes = {
    title: PropTypes.string.isRequired,
    hintImage: PropTypes.string,
    hintNote: PropTypes.string,
    navigatorImage: PropTypes.string,
    conceptText: PropTypes.string,
    headerColor: PropTypes.string,
    onClose: PropTypes.func.isRequired
};

HintModal.defaultProps = {
    hintImage: null,
    hintNote: null,
    navigatorImage: null,
    conceptText: null,
    headerColor: null
};

export default HintModal;
