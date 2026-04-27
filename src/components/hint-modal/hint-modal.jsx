import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styles from './hint-modal.css';

const HintModal = ({hintImage, hintNote, onClose}) => ReactDOM.createPortal(
    <div className={styles.overlay}>
        <div className={styles.modal}>
            <div className={styles.header}>
                <span>{'💡 ヒント！'}</span>
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
        </div>
    </div>,
    document.body
);

HintModal.propTypes = {
    hintImage: PropTypes.string,
    hintNote: PropTypes.string,
    onClose: PropTypes.func.isRequired
};

HintModal.defaultProps = {
    hintImage: null,
    hintNote: null
};

export default HintModal;
