import React, {useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import VM from 'scratch-vm';
import styles from './tutorial-panel.css';
import HintModal from '../hint-modal/hint-modal.jsx';
import checkConditions from '../../lib/check-conditions.js';

import asukaDefault from '../../assets/navigator/asuka_default.png';
import asukaSmile1 from '../../assets/navigator/asuka_smile1.png';
import asukaSmile2 from '../../assets/navigator/asuka_smile2.png';
import asukaJoy from '../../assets/navigator/asuka_joy.png';
import asukaSad from '../../assets/navigator/asuka_sad.png';
import asukaAngry from '../../assets/navigator/asuka_angry.png';
import asukaSurprise from '../../assets/navigator/asuka_surprise.png';

const NAVIGATOR_IMAGES = {
    asuka_default: asukaDefault,
    asuka_smile1: asukaSmile1,
    asuka_smile2: asukaSmile2,
    asuka_joy: asukaJoy,
    asuka_sad: asukaSad,
    asuka_angry: asukaAngry,
    asuka_surprise: asukaSurprise
};

const getImage = key => NAVIGATOR_IMAGES[key] || asukaDefault;

const TutorialPanel = ({scenario, vm}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [showConcept, setShowConcept] = useState(false);
    const [showHintModal, setShowHintModal] = useState(false);
    const [result, setResult] = useState(null); // null | 'success' | 'failure'

    const {steps, success, failure, title} = scenario;
    const totalSteps = steps.length;
    const isLastStep = currentStep === totalSteps - 1;
    const step = steps[currentStep];
    const hasHint = step.hintImage || step.hintNote;

    const handlePrev = () => {
        setCurrentStep(i => i - 1);
        setShowConcept(false);
        setShowHintModal(false);
    };

    const handleNext = () => {
        setCurrentStep(i => i + 1);
        setShowConcept(false);
        setShowHintModal(false);
    };

    const handleCheck = () => {
        const passed = checkConditions(vm, step.conditions, step.targetName);
        setResult(passed ? 'success' : 'failure');
        setShowHintModal(false);
    };

    const handleRetry = () => {
        setResult(null);
        setShowHintModal(false);
    };

    if (result) {
        const resultData = result === 'success' ? success : failure;
        const navigatorKey = result === 'success' ? 'asuka_joy' : 'asuka_sad';
        return (
            <div className={styles.tutorialPanel}>
                <div className={styles.panelHeader}>{title}</div>
                <div className={styles.iconArea}>
                    <img
                        className={styles.iconImage}
                        src={getImage(navigatorKey)}
                        alt="キャラクター"
                    />
                </div>
                <div className={classNames(
                    styles.descriptionArea,
                    result === 'success' ? styles.successArea : styles.failureArea
                )}>
                    {resultData.message.split('\n').map((line, i) => (
                        <span key={i}>{line}<br /></span>
                    ))}
                </div>
                <div className={styles.buttonArea}>
                    {result === 'failure' && (step.hintImage || step.hintNote) && (
                        <button
                            className={styles.hintModalButton}
                            onClick={() => setShowHintModal(true)}
                        >
                            {'💡 ヒントを見てみるのです！'}
                        </button>
                    )}
                    <button
                        className={styles.checkButton}
                        onClick={result === 'success' ? handleRetry : handleRetry}
                    >
                        {result === 'success' ? '次のレッスンへ' : 'やり直す'}
                    </button>
                </div>
                {showHintModal && (
                    <HintModal
                        hintImage={step.hintImage}
                        hintNote={step.hintNote}
                        onClose={() => setShowHintModal(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={styles.tutorialPanel}>
            <div className={styles.panelHeader}>{title}</div>
            <div className={styles.iconArea}>
                <img
                    className={styles.iconImage}
                    src={getImage(step.navigatorImage)}
                    alt="キャラクター"
                />
            </div>
            <div className={styles.stepIndicator}>
                {`${currentStep + 1} / ${totalSteps}`}
            </div>
            <div className={styles.stepTitle}>{step.title}</div>
            <div className={styles.descriptionArea}>{step.body}</div>

            {showConcept && step.concept && (
                <div className={styles.conceptBox}>
                    {step.conceptImage && (
                        <img
                            className={styles.conceptImage}
                            src={getImage(step.conceptImage)}
                            alt="コンセプト"
                        />
                    )}
                    <p className={styles.conceptText}>
                        {step.concept.split('\n').map((line, i) => (
                            <span key={i}>{line}<br /></span>
                        ))}
                    </p>
                </div>
            )}

            <div className={styles.buttonArea}>
                {step.concept && (
                    <button
                        className={styles.hintButton}
                        onClick={() => setShowConcept(h => !h)}
                    >
                        {showConcept ? '💡 ポイント解説を閉じる' : '💡 ポイント解説を見る'}
                    </button>
                )}
                {hasHint && (
                    <button
                        className={styles.hintModalButton}
                        onClick={() => setShowHintModal(true)}
                    >
                        {'🔍 ヒントを見る'}
                    </button>
                )}
                {isLastStep && (
                    <button
                        className={styles.checkButton}
                        onClick={handleCheck}
                    >
                        {'チェックしよう'}
                    </button>
                )}
            </div>

            <div className={styles.navArea}>
                <button
                    className={styles.prevButton}
                    disabled={currentStep === 0}
                    onClick={handlePrev}
                >
                    {'← 前へ'}
                </button>
                <button
                    className={styles.nextButton}
                    disabled={isLastStep}
                    onClick={handleNext}
                >
                    {'次へ →'}
                </button>
            </div>

            {showHintModal && (
                <HintModal
                    hintImage={step.hintImage}
                    hintNote={step.hintNote}
                    onClose={() => setShowHintModal(false)}
                />
            )}
        </div>
    );
};

TutorialPanel.propTypes = {
    scenario: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string.isRequired,
        steps: PropTypes.arrayOf(PropTypes.shape({
            navigatorImage: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            body: PropTypes.string.isRequired,
            concept: PropTypes.string,
            conceptImage: PropTypes.string,
            hintImage: PropTypes.string,
            hintNote: PropTypes.string,
            conditions: PropTypes.arrayOf(PropTypes.shape({
                type: PropTypes.string.isRequired,
                opcode: PropTypes.string.isRequired,
                field: PropTypes.string,
                value: PropTypes.number
            }))
        })).isRequired,
        success: PropTypes.shape({
            navigatorImage: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired
        }).isRequired,
        failure: PropTypes.shape({
            navigatorImage: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired
        }).isRequired
    }).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default TutorialPanel;
