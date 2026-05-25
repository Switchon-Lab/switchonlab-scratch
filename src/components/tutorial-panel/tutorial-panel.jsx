import React, {useState, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import VM from 'scratch-vm';
import styles from './tutorial-panel.css';
import HintModal from '../hint-modal/hint-modal.jsx';
import RoadmapModal from '../roadmap-modal/roadmap-modal.jsx';
import checkConditions from '../../lib/check-conditions.js';

const NAVIGATOR_IMAGES = {
    asuka_default: '/navigator/asuka_default.png',
    asuka_smile1: '/navigator/asuka_smile1.png',
    asuka_smile2: '/navigator/asuka_smile2.png',
    asuka_joy: '/navigator/asuka_joy.png',
    asuka_sad: '/navigator/asuka_sad.png',
    asuka_angry: '/navigator/asuka_angry.png',
    asuka_surprise: '/navigator/asuka_surprise.png'
};

const getImage = key => NAVIGATOR_IMAGES[key] || NAVIGATOR_IMAGES.asuka_default;

// Scratchカテゴリ名と対応する色
const CATEGORY_STYLES = {
    動き: {color: '#4C97FF', fontWeight: 'bold'},
    見た目: {color: '#9966FF', fontWeight: 'bold'},
    音: {color: '#CF63CF', fontWeight: 'bold'},
    イベント: {color: '#B8860B', fontWeight: 'bold'},
    制御: {color: '#FF8C1A', fontWeight: 'bold'},
    調べる: {color: '#5CB1D6', fontWeight: 'bold'},
    演算: {color: '#59C059', fontWeight: 'bold'},
    変数: {color: '#FF8C1A', fontWeight: 'bold'},
    ブロック定義: {color: '#FF6680', fontWeight: 'bold'}
};

const CATEGORY_KEYS = Object.keys(CATEGORY_STYLES).sort((a, b) => b.length - a.length);
const TOKEN_RE = new RegExp(`「[^」]*」|${CATEGORY_KEYS.join('|')}|[。？！]`, 'g');

// テキストを装飾付きReact要素に変換
// ③ 。？！で改行 ④ カテゴリ名を色付き太字 ⑤ 「」内のブロック名を太字
const formatBody = (text, keyPrefix) => {
    const elements = [];
    const lines = text.split('\n');
    lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) elements.push(<br key={`${keyPrefix}-nl-${lineIdx}`} />);
        const tokens = [];
        let pos = 0;
        TOKEN_RE.lastIndex = 0;
        let match;
        while ((match = TOKEN_RE.exec(line)) !== null) {
            if (match.index > pos) {
                tokens.push({type: 'text', value: line.slice(pos, match.index)});
            }
            const val = match[0];
            if (val.startsWith('「')) {
                tokens.push({type: 'block', value: val});
            } else if (val === '。' || val === '？' || val === '！') {
                tokens.push({type: 'punct', value: val});
            } else {
                tokens.push({type: 'category', value: val});
            }
            pos = match.index + val.length;
        }
        if (pos < line.length) {
            tokens.push({type: 'text', value: line.slice(pos)});
        }
        tokens.forEach((token, tokenIdx) => {
            const key = `${keyPrefix}-${lineIdx}-${tokenIdx}`;
            if (token.type === 'text') {
                elements.push(<span key={key}>{token.value}</span>);
            } else if (token.type === 'block') {
                const inner = token.value.slice(1, -1);
                if (CATEGORY_STYLES[inner]) {
                    // カテゴリ名が「」で囲まれている場合は色付き太字
                    elements.push(
                        <strong
                            key={key}
                            style={CATEGORY_STYLES[inner]}
                        >{token.value}</strong>
                    );
                } else {
                    elements.push(<strong key={key}>{token.value}</strong>);
                }
            } else if (token.type === 'category') {
                elements.push(
                    <span
                        key={key}
                        style={CATEGORY_STYLES[token.value]}
                    >{token.value}</span>
                );
            } else if (token.type === 'punct') {
                elements.push(<span key={key}>{token.value}</span>);
                // 同一行にまだ内容があるときだけ改行を挿入
                const hasMore = tokens.slice(tokenIdx + 1).some(t => t.value.trim() !== '');
                if (hasMore) {
                    elements.push(<br key={`${key}-br`} />);
                }
            }
        });
    });
    return elements;
};

const CONCEPT_IMAGES = ['asuka_joy', 'asuka_smile2', 'asuka_surprise'];

const TutorialPanel = ({scenario, vm}) => {
    const [authStatus, setAuthStatus] = useState('pending'); // 'pending' | 'ok' | 'blocked'
    const [currentStep, setCurrentStep] = useState(0);
    const [showConceptModal, setShowConceptModal] = useState(false);
    const [showHintModal, setShowHintModal] = useState(false);
    const [result, setResult] = useState(null); // null | 'success' | 'failure'
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const [conceptImageKey, setConceptImageKey] = useState('asuka_surprise');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const project = params.get('project');
        const token = params.get('token');
        const ts = params.get('ts');

        if (!token || !ts) {
            setAuthStatus('blocked');
            return;
        }

        fetch('/api/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({project, token, ts})
        })
            .then(res => setAuthStatus(res.ok ? 'ok' : 'blocked'))
            .catch(() => setAuthStatus('blocked'));
    }, []);

    // scenario が null の場合も null-safe に参照（hooks は条件分岐より前に置く必要があるため）
    const step = scenario ? scenario.steps[currentStep] : null;

    const handlePrev = useCallback(() => {
        setCurrentStep(i => i - 1);
        setShowConceptModal(false);
        setShowHintModal(false);
    }, []);

    const handleNext = useCallback(() => {
        setCurrentStep(i => i + 1);
        setShowConceptModal(false);
        setShowHintModal(false);
    }, []);

    const handleCheck = useCallback(() => {
        if (!step) return;
        const passed = checkConditions(vm, step.conditions, step.targetName);
        setResult(passed ? 'success' : 'failure');
        setShowConceptModal(false);
        setShowHintModal(false);
    }, [vm, step]);

    const handleRetry = useCallback(() => {
        setResult(null);
        setShowConceptModal(false);
        setShowHintModal(false);
    }, []);

    const handleOpenHintModal = useCallback(() => setShowHintModal(true), []);
    const handleCloseHintModal = useCallback(() => setShowHintModal(false), []);
    const handleOpenRoadmap = useCallback(() => setShowRoadmapModal(true), []);
    const handleCloseRoadmap = useCallback(() => setShowRoadmapModal(false), []);
    const handleOpenConceptModal = useCallback(() => {
        const randomKey = CONCEPT_IMAGES[Math.floor(Math.random() * CONCEPT_IMAGES.length)];
        setConceptImageKey(randomKey);
        setShowConceptModal(true);
    }, []);
    const handleCloseConceptModal = useCallback(() => setShowConceptModal(false), []);

    // hooks はすべて呼び出し済み。ここから条件分岐・早期 return が可能
    if (!scenario || authStatus === 'pending') {
        return (
            <div className={styles.tutorialPanel}>
                <div className={styles.panelHeader}>{'SwitchOnLab'}</div>
                <div className={styles.authState}>{'読み込み中…'}</div>
            </div>
        );
    }

    if (authStatus === 'blocked') {
        return (
            <div className={styles.tutorialPanel}>
                <div className={styles.panelHeader}>{'アクセスエラー'}</div>
                <div className={styles.authState}>
                    {'このページは直接アクセスできません。'}<br />
                    {'学習サイトから開いてください。'}
                </div>
            </div>
        );
    }

    // ここに到達した時点で scenario は非 null かつ認証済み
    const {steps, success, failure, title, id, lessons} = scenario;
    const totalSteps = steps.length;
    const isLastStep = currentStep === totalSteps - 1;
    const hasHint = step.hintImage || step.hintNote;
    const panelTitle = id ? `${id}: ${title}` : title;
    const lessonNo = id ? parseInt(id.replace(/\D/g, ''), 10) : 0;

    if (result) {
        const resultData = result === 'success' ? success : failure;
        const navigatorKey = result === 'success' ? 'asuka_joy' : 'asuka_sad';
        return (
            <div className={styles.tutorialPanel}>
                <div className={styles.panelHeader}>{panelTitle}</div>
                <div className={styles.topArea}>
                    <div className={styles.iconArea}>
                        <img
                            className={styles.iconImage}
                            src={getImage(navigatorKey)}
                            alt="キャラクター"
                        />
                    </div>
                </div>
                <div
                    className={classNames(
                        styles.descriptionArea,
                        result === 'success' ? styles.successArea : styles.failureArea
                    )}
                >
                    {resultData.message.split('\n').map((line, i) => (
                        <span key={i}>{line}<br /></span>
                    ))}
                </div>
                <div className={styles.bottomArea}>
                    <div className={styles.buttonArea}>
                        {result === 'failure' && (step.hintImage || step.hintNote) && (
                            <button
                                className={styles.hintModalButton}
                                onClick={handleOpenHintModal}
                            >
                                {'💡 ヒントを見てみるのです！'}
                            </button>
                        )}
                        <button
                            className={styles.checkButton}
                            onClick={result === 'success' ? handleOpenRoadmap : handleRetry}
                        >
                            {result === 'success' ? '次のレッスンへ' : 'やり直す'}
                        </button>
                    </div>
                </div>
                {showHintModal && (
                    <HintModal
                        title={'💡 ヒント！'}
                        hintImage={step.hintImage}
                        hintNote={step.hintNote}
                        onClose={handleCloseHintModal}
                    />
                )}
                {showRoadmapModal && (
                    <RoadmapModal
                        lessons={lessons || []}
                        currentLessonNo={lessonNo}
                        onClose={handleCloseRoadmap}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={styles.tutorialPanel}>
            <div className={styles.panelHeader}>{panelTitle}</div>
            <div className={styles.topArea}>
                <div className={styles.iconArea}>
                    <img
                        className={styles.iconImage}
                        src={getImage(step.navigatorImage)}
                        alt="キャラクター"
                    />
                </div>
                <div className={styles.stepIndicator}>
                    {`Step ${currentStep + 1} / ${totalSteps}`}
                </div>
                <div className={styles.stepTitle}>{step.title}</div>
            </div>
            <div className={styles.descriptionArea}>{formatBody(step.body, 'body')}</div>
            <div className={styles.bottomArea}>
                <div className={styles.buttonArea}>
                    {step.concept && (
                        <button
                            className={styles.hintButton}
                            onClick={handleOpenConceptModal}
                        >
                            {'💡 ポイント解説を見る'}
                        </button>
                    )}
                    {hasHint && (
                        <button
                            className={styles.hintModalButton}
                            onClick={handleOpenHintModal}
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
            </div>

            {showHintModal && (
                <HintModal
                    title={'💡 ヒント！'}
                    hintImage={step.hintImage}
                    hintNote={step.hintNote}
                    onClose={handleCloseHintModal}
                />
            )}
            {showConceptModal && step.concept && (
                <HintModal
                    title={'💡 ポイント解説'}
                    headerColor={'#2E7D32'}
                    navigatorImage={getImage(conceptImageKey)}
                    conceptText={step.concept}
                    onClose={handleCloseConceptModal}
                />
            )}
        </div>
    );
};

TutorialPanel.propTypes = {
    scenario: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string.isRequired,
        lessons: PropTypes.array,
        steps: PropTypes.arrayOf(PropTypes.shape({
            navigatorImage: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            body: PropTypes.string.isRequired,
            targetName: PropTypes.string,
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
