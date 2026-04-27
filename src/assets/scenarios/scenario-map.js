import L2Scenario from './L2_show_bowl.json';
import L3Scenario from './L3_move_bowl.json';
import L4Scenario from './L4_drop_apple.json';
import L5Scenario from './L5_random_apple.json';
import L6Scenario from './L6_catch_apple.json';
import L7Scenario from './L7_score.json';
import L8Scenario from './L8_gameover.json';

const SCENARIO_MAP = {
    'AppleCatch-l2.sb3': L2Scenario,
    'AppleCatch-l3.sb3': L3Scenario,
    'AppleCatch-l4.sb3': L4Scenario,
    'AppleCatch-l5.sb3': L5Scenario,
    'AppleCatch-l6.sb3': L6Scenario,
    'AppleCatch-l7.sb3': L7Scenario,
    'AppleCatch-l8.sb3': L8Scenario
};

const DEFAULT_SCENARIO = L2Scenario;

const getScenario = () => {
    const params = new URLSearchParams(window.location.search);
    const project = params.get('project');
    return SCENARIO_MAP[project] || DEFAULT_SCENARIO;
};

export default getScenario;
