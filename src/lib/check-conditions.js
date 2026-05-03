/**
 * scratch-vm のブロック状態とシナリオ条件を照合する。
 *
 * @param {object} vm - scratch-vm インスタンス
 * @param {Array}  conditions - チェックする条件の配列
 * @param {string} [targetName] - 対象スプライト名（省略時は最初の非ステージ）
 *
 * condition types:
 *   targetSelected - 現在編集中のスプライト名が一致するか
 *   blockExists    - 指定opcodeのブロックが存在するか
 *   hasBlockWithField - 指定opcodeのブロックのフィールド値が一致するか（プルダウン選択の検証）
 *                    field: フィールド名（例: 'STOP_OPTION', 'KEY_OPTION'）
 *                    value: 期待する文字列値
 *   ifKeyInForever - control_foreverのSUBSTACK内のcontrol_ifのCONDITIONが
 *                    指定キーのsensing_keypressedであるか（keyで指定）
 *                    ※ keyPressed は全ブロック横断のため他箇所のキーにも反応してしまう
 *   waitUntilNotKey - control_wait_until の CONDITION が operator_not → sensing_keypressed(key) であるか
 *                    key: 期待するキー値（例: 'space'）
 *   soundPlayWithName - sound_play が指定の音名を使用しているか
 *                    name: 期待する音名（例: 'Low Whoosh'）
 *   hasNestedBlock - 指定parentOpcodeのSUBSTACK内に指定childOpcodeのブロックが存在するか
 *                    parentOpcode: 親ブロックのopcode（例: 'control_forever'）
 *                    childOpcode: 子ブロックのopcode（例: 'motion_changeyby'）
 *   hasNestedBlockWithInput - parentOpcodeのSUBSTACK内にchildOpcodeが存在し、
 *                    かつそのブロックのfieldがvalueと一致するか
 *                    parentOpcode: 親ブロックのopcode, childOpcode: 子ブロックのopcode
 *                    field: 入力名（例: 'DURATION'）, value: 期待する数値
 *   inputValue     - 指定opcodeのブロックの入力値が一致するか
 *                    field: 入力名（例: 'X', 'Y', 'SIZE', 'DX', 'DY'）
 *                    value: 期待する数値
 *   randomValue    - operator_random の FROM・TO 値が一致するか
 *                    from: 期待する FROM 値, to: 期待する TO 値
 *   variableExists - 指定した名前の変数が存在するか（全ターゲットを検索）
 *                    name: 変数名
 *   blockInsideIf  - 指定条件の control_if の中に childOpcode が含まれるか
 *                    ifOpcode: ifの条件ブロックのopcode（例: 'sensing_touchingobject'）
 *                    childOpcode: if内で探すブロックのopcode
 *                    field/fieldValue: 任意。childOpcodeのフィールド値も確認する
 *   fieldValue     - 指定opcodeのブロックの入力またはフィールドの値が一致するか
 *                    opcode: 対象ブロックのopcode
 *                    field: 入力名またはフィールド名
 *                    value: 期待する文字列値
 *   keyPressed     - sensing_keypressed の KEY_OPTION が指定したキー値と一致するか
 *                    key: 期待するキー値（例: 'right arrow', 'left arrow', 'space'）
 *   keyMovePair         - 指定キーのif内に指定opcode・フィールド値のブロックが存在するか
 *                         key: キー値, opcode: 対象ブロックのopcode
 *                         field: 入力フィールド名, value: 期待する数値
 *   randomInXPosition   - motion_gotoxy の X 入力に operator_random が入っており
 *                         FROM・TO 値が一致するか
 *                         from: 期待する FROM 値, to: 期待する TO 値
 *   touchingObjectInForever     - control_forever の中に指定オブジェクトへの touching if があるか
 *                                 objectName: 触れる対象の名前（例: 'Bowl'）
 *   insideTouchingBowl          - Bowl触れたなら の if 内に childOpcode が存在するか
 *                                 childOpcode: if内で探すブロックのopcode
 *                                 field/fieldValue: 任意。入力値も確認する（数値比較）
 *   randomInXInsideTouchingBowl - Bowl if 内の motion_gotoxy の X に operator_random が入り
 *                                 Y 値が一致するか
 *                                 from/to: 乱数範囲, y: 期待するY値
 *   variableVisible      - 指定した名前の変数がモニター表示状態か（全ターゲットを検索）
 *                          name: 変数名
 *   scoreResetAtStart    - event_whenflagclicked の next チェーンに data_setvariableto が
 *                          control_forever より前に存在するか
 *   scoreIncrementInsideBowlIf - Bowl触れたなら の if 内に data_changevariableby があるか
 * @returns {boolean} すべての条件を満たす場合 true
 */
const checkConditions = (vm, conditions, targetName) => {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
        const __r = (() => {
        // variableExists はターゲット横断で変数名を検索
            if (condition.type === 'variableExists') {
                return vm.runtime.targets.some(t =>
                    Object.values(t.variables).some(v => v.name === condition.name)
                );
            }

            // variableVisible はターゲット横断で変数の表示状態を確認
            if (condition.type === 'variableVisible') {
                for (const t of vm.runtime.targets) {
                    const variable = Object.values(t.variables).find(v => v.name === condition.name);
                    if (variable) {
                    // _monitorState 経由で確認（Immutable.js Map の場合は .get() を使用）
                        const monitorState = vm.runtime._monitorState;
                        if (monitorState) {
                            const entry = monitorState.get(variable.id);
                            if (entry !== null && entry !== void 0) {
                                const visible = typeof entry.get === 'function' ?
                                    entry.get('visible') :
                                    entry.visible;
                                return visible === true;
                            }
                        }
                        // フォールバック: variable.visible を直接確認
                        return variable.visible === true;
                    }
                }
                return false;
            }

            // targetSelected はブロック検索不要
            if (condition.type === 'targetSelected') {
                return (
                    vm.editingTarget &&
                vm.editingTarget.sprite &&
                vm.editingTarget.sprite.name === condition.name
                );
            }

            // ブロック系の条件：対象スプライトを特定（"Stage" 指定時はステージを対象にする）
            const target = targetName === 'Stage' ?
                vm.runtime.targets.find(t => t.isStage) :
                targetName ?
                    vm.runtime.targets.find(t => !t.isStage && t.sprite && t.sprite.name === targetName) :
                    vm.runtime.targets.find(t => !t.isStage);

            if (!target) return false;

            const blocks = target.blocks._blocks;
            const blockList = Object.values(blocks);

            // sensing_touchingobject の触れる対象名を取得するヘルパー
            const getTouchingObjectName = touchingBlock => {
                if (!touchingBlock.inputs || !touchingBlock.inputs.TOUCHINGOBJECTMENU) return null;
                const menuId = touchingBlock.inputs.TOUCHINGOBJECTMENU.block ||
                           touchingBlock.inputs.TOUCHINGOBJECTMENU.shadow;
                if (!menuId) return null;
                const menuBlock = blocks[menuId];
                if (!menuBlock || !menuBlock.fields || !menuBlock.fields.TOUCHINGOBJECTMENU) return null;
                return menuBlock.fields.TOUCHINGOBJECTMENU.value;
            };

            // 指定オブジェクトに触れたなら の control_if を返すヘルパー
            const findTouchingIf = objectName =>
                blockList.find(b => {
                    if (b.opcode !== 'control_if' || !b.inputs || !b.inputs.CONDITION) return false;
                    const condBlock = blocks[b.inputs.CONDITION.block];
                    if (!condBlock || condBlock.opcode !== 'sensing_touchingobject') return false;
                    return getTouchingObjectName(condBlock) === objectName;
                });

            switch (condition.type) {

            case 'blockExists':
                return blockList.some(b => b.opcode === condition.opcode);

            case 'hasBlockWithField': {
            // プルダウン等のフィールド値を検索（直接フィールド、またはshadow入力ブロック経由）
                const matchingBlocks = blockList.filter(b => b.opcode === condition.opcode);
                return matchingBlocks.some(block => {
                    // 直接フィールドを確認
                    const directField = block.fields && block.fields[condition.field];
                    if (directField !== null && directField !== undefined) {
                        return String(directField.value) === String(condition.value);
                    }
                    // shadow 入力ブロック経由で確認（例: control_create_clone_of → CLONE_OPTION）
                    if (!block.inputs) return false;
                    const input = block.inputs[condition.field];
                    if (!input) return false;
                    const menuId = input.block || input.shadow;
                    if (!menuId) return false;
                    const menuBlock = blocks[menuId];
                    if (!menuBlock || !menuBlock.fields) return false;
                    const fieldObj = menuBlock.fields[condition.field] ||
                        Object.values(menuBlock.fields)[0];
                    return fieldObj !== null && fieldObj !== undefined && String(fieldObj.value) === String(condition.value);
                });
            }

            case 'ifKeyInForever': {
            // control_forever のSUBSTACK内のcontrol_ifのCONDITIONが
            // 指定キーのsensing_keypressedであるか確認
                const foreverBlocks = blockList.filter(b => b.opcode === 'control_forever');
                return foreverBlocks.some(foreverBlock => {
                    if (!foreverBlock.inputs || !foreverBlock.inputs.SUBSTACK) return false;
                    let currentId = foreverBlock.inputs.SUBSTACK.block;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === 'control_if' &&
                            currentBlock.inputs && currentBlock.inputs.CONDITION) {
                            const condBlock = blocks[currentBlock.inputs.CONDITION.block];
                            if (condBlock && condBlock.opcode === 'sensing_keypressed' &&
                                condBlock.inputs && condBlock.inputs.KEY_OPTION) {
                                const menuId = condBlock.inputs.KEY_OPTION.block ||
                                               condBlock.inputs.KEY_OPTION.shadow;
                                const menuBlock = menuId && blocks[menuId];
                                if (menuBlock && menuBlock.fields &&
                                    menuBlock.fields.KEY_OPTION &&
                                    menuBlock.fields.KEY_OPTION.value === condition.key) {
                                    return true;
                                }
                            }
                        }
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'hasNestedBlock': {
            // parentOpcodeのSUBSTACK（Cブロック）またはnext（ハットブロック）をたどってchildOpcodeを探す
                const parentBlocks = blockList.filter(b => b.opcode === condition.parentOpcode);
                return parentBlocks.some(parentBlock => {
                    const startId = (parentBlock.inputs && parentBlock.inputs.SUBSTACK)
                        ? parentBlock.inputs.SUBSTACK.block
                        : parentBlock.next;
                    if (!startId) return false;
                    let currentId = startId;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === condition.childOpcode) return true;
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'hasNestedBlockWithInput': {
            // parentOpcodeのSUBSTACK/next内にchildOpcodeが存在し、かつそのfieldがvalueと一致するか
                const getInputNum = (block, fieldName) => {
                    if (!block.inputs) return null;
                    const input = block.inputs[fieldName];
                    if (!input) return null;
                    const valueBlockId = input.block || input.shadow;
                    if (!valueBlockId) return null;
                    const valueBlock = blocks[valueBlockId];
                    if (!valueBlock || !valueBlock.fields) return null;
                    const fieldValues = Object.values(valueBlock.fields);
                    return fieldValues.length > 0 ? Number(fieldValues[0].value) : null;
                };
                const parentBlocks = blockList.filter(b => b.opcode === condition.parentOpcode);
                return parentBlocks.some(parentBlock => {
                    const startId = (parentBlock.inputs && parentBlock.inputs.SUBSTACK)
                        ? parentBlock.inputs.SUBSTACK.block
                        : parentBlock.next;
                    if (!startId) return false;
                    let currentId = startId;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === condition.childOpcode) {
                            const actual = getInputNum(currentBlock, condition.field);
                            if (actual !== null && actual === Number(condition.value)) return true;
                        }
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'inputValue': {
            // 同一opcodeのブロックが複数ある場合も、いずれか1つが条件を満たせばOK
                const matchingBlocks = blockList.filter(b => b.opcode === condition.opcode);
                return matchingBlocks.some(block => {
                    if (!block.inputs) return false;

                    const input = block.inputs[condition.field];
                    if (!input) return false;

                    const valueBlockId = input.block || input.shadow;
                    if (!valueBlockId) return false;

                    const valueBlock = blocks[valueBlockId];
                    if (!valueBlock || !valueBlock.fields) return false;

                    const fieldValues = Object.values(valueBlock.fields);
                    if (fieldValues.length === 0) return false;

                    return Number(fieldValues[0].value) === Number(condition.value);
                });
            }

            case 'randomValue': {
            // operator_random の FROM・TO 入力値を確認
                const randomBlocks = blockList.filter(b => b.opcode === 'operator_random');
                return randomBlocks.some(block => {
                    if (!block.inputs) return false;

                    const getInputValue = inputName => {
                        const input = block.inputs[inputName];
                        if (!input) return null;
                        const valueBlockId = input.block || input.shadow;
                        if (!valueBlockId) return null;
                        const valueBlock = blocks[valueBlockId];
                        if (!valueBlock || !valueBlock.fields) return null;
                        const fieldValues = Object.values(valueBlock.fields);
                        if (fieldValues.length === 0) return null;
                        return Number(fieldValues[0].value);
                    };

                    return (
                        getInputValue('FROM') === Number(condition.from) &&
                    getInputValue('TO') === Number(condition.to)
                    );
                });
            }

            case 'fieldValue': {
            // 指定opcodeのブロックを探し、フィールドまたは入力ブロックの値を文字列比較
                const matchingBlocks = blockList.filter(b => b.opcode === condition.opcode);
                return matchingBlocks.some(block => {
                // 直接フィールドをチェック（ドロップダウン等）
                    const directField = block.fields && block.fields[condition.field];
                    if (directField !== null && directField !== void 0) {
                        return String(directField.value) === String(condition.value);
                    }
                    // 入力ブロック経由でチェック（テキスト入力・メニュー入力等）
                    if (!block.inputs) return false;
                    const input = block.inputs[condition.field];
                    if (!input) return false;
                    const valueBlockId = input.block || input.shadow;
                    if (!valueBlockId) return false;
                    const valueBlock = blocks[valueBlockId];
                    if (!valueBlock || !valueBlock.fields) return false;
                    // 同名フィールドを優先、なければ最初のフィールド値を使用
                    const fieldObj = valueBlock.fields[condition.field] ||
                    Object.values(valueBlock.fields)[0];
                    const fieldExists = fieldObj !== null && fieldObj !== void 0;
                    return fieldExists && String(fieldObj.value) === String(condition.value);
                });
            }

            case 'waitUntilNotKey': {
            // control_wait_until の CONDITION が operator_not → sensing_keypressed(key) であるか確認
                const waitBlocks = blockList.filter(b => b.opcode === 'control_wait_until');
                return waitBlocks.some(waitBlock => {
                    if (!waitBlock.inputs || !waitBlock.inputs.CONDITION) return false;
                    const notBlock = blocks[waitBlock.inputs.CONDITION.block];
                    if (!notBlock || notBlock.opcode !== 'operator_not') return false;
                    if (!notBlock.inputs || !notBlock.inputs.OPERAND) return false;
                    const keypressedBlock = blocks[notBlock.inputs.OPERAND.block];
                    if (!keypressedBlock || keypressedBlock.opcode !== 'sensing_keypressed') return false;
                    if (!keypressedBlock.inputs || !keypressedBlock.inputs.KEY_OPTION) return false;
                    const menuId = keypressedBlock.inputs.KEY_OPTION.block ||
                                   keypressedBlock.inputs.KEY_OPTION.shadow;
                    const menuBlock = menuId && blocks[menuId];
                    return !!(menuBlock && menuBlock.fields &&
                        menuBlock.fields.KEY_OPTION &&
                        menuBlock.fields.KEY_OPTION.value === condition.key);
                });
            }

            case 'soundPlayWithName': {
            // sound_play の SOUND_MENU 入力（sound_sounds_menu）のフィールド値を確認
                const soundPlayBlocks = blockList.filter(b => b.opcode === 'sound_play');
                return soundPlayBlocks.some(block => {
                    if (!block.inputs || !block.inputs.SOUND_MENU) return false;
                    const menuId = block.inputs.SOUND_MENU.block || block.inputs.SOUND_MENU.shadow;
                    if (!menuId) return false;
                    const menuBlock = blocks[menuId];
                    if (!menuBlock || !menuBlock.fields || !menuBlock.fields.SOUND_MENU) return false;
                    return menuBlock.fields.SOUND_MENU.value === condition.name;
                });
            }

            case 'keyPressed': {
            // sensing_keypressed の KEY_OPTION 入力（sensing_keyoptions）のフィールド値を確認
                const keypressedBlocks = blockList.filter(b => b.opcode === 'sensing_keypressed');
                return keypressedBlocks.some(block => {
                    if (!block.inputs || !block.inputs.KEY_OPTION) return false;
                    const menuBlockId = block.inputs.KEY_OPTION.block || block.inputs.KEY_OPTION.shadow;
                    if (!menuBlockId) return false;
                    const menuBlock = blocks[menuBlockId];
                    if (!menuBlock || !menuBlock.fields || !menuBlock.fields.KEY_OPTION) return false;
                    return menuBlock.fields.KEY_OPTION.value === condition.key;
                });
            }

            case 'randomInXPosition': {
            // motion_gotoxy の X 入力に operator_random が直接入っているか確認
                const gotoxyBlocks = blockList.filter(b => b.opcode === 'motion_gotoxy');
                return gotoxyBlocks.some(gotoxyBlock => {
                    if (!gotoxyBlock.inputs || !gotoxyBlock.inputs.X) return false;
                    const xBlockId = gotoxyBlock.inputs.X.block;
                    if (!xBlockId) return false;
                    const xBlock = blocks[xBlockId];
                    if (!xBlock || xBlock.opcode !== 'operator_random') return false;
                    if (!xBlock.inputs) return false;

                    const getInputNum = inputName => {
                        const input = xBlock.inputs[inputName];
                        if (!input) return null;
                        const valueBlockId = input.block || input.shadow;
                        if (!valueBlockId) return null;
                        const valueBlock = blocks[valueBlockId];
                        if (!valueBlock || !valueBlock.fields) return null;
                        const fieldValues = Object.values(valueBlock.fields);
                        if (fieldValues.length === 0) return null;
                        return Number(fieldValues[0].value);
                    };

                    return (
                        getInputNum('FROM') === Number(condition.from) &&
                    getInputNum('TO') === Number(condition.to)
                    );
                });
            }

            case 'keyMovePair': {
            // 1. 指定キーの sensing_keyoptions を探す
                const keyOptionBlocks = blockList.filter(b =>
                    b.opcode === 'sensing_keyoptions' &&
                b.fields &&
                b.fields.KEY_OPTION &&
                b.fields.KEY_OPTION.value === condition.key
                );
                return keyOptionBlocks.some(keyOptionBlock => {
                // 2. そのキーオプションを参照する sensing_keypressed を探す
                    const keypressedBlock = blockList.find(b =>
                        b.opcode === 'sensing_keypressed' &&
                    b.inputs &&
                    b.inputs.KEY_OPTION &&
                    (b.inputs.KEY_OPTION.block === keyOptionBlock.id ||
                     b.inputs.KEY_OPTION.shadow === keyOptionBlock.id)
                    );
                    if (!keypressedBlock) return false;

                    // 3. その sensing_keypressed を CONDITION に持つ control_if を探す
                    const ifBlock = blockList.find(b =>
                        b.opcode === 'control_if' &&
                    b.inputs &&
                    b.inputs.CONDITION &&
                    b.inputs.CONDITION.block === keypressedBlock.id
                    );
                    if (!ifBlock || !ifBlock.inputs || !ifBlock.inputs.SUBSTACK) return false;

                    // 4. SUBSTACK から next をたどり指定opcode・フィールド値のブロックを探す
                    let currentId = ifBlock.inputs.SUBSTACK.block;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === condition.opcode && currentBlock.inputs) {
                            const input = currentBlock.inputs[condition.field];
                            if (input) {
                                const valueBlockId = input.block || input.shadow;
                                if (valueBlockId) {
                                    const valueBlock = blocks[valueBlockId];
                                    if (valueBlock && valueBlock.fields) {
                                        const fieldValues = Object.values(valueBlock.fields);
                                        if (fieldValues.length > 0 &&
                                        Number(fieldValues[0].value) === Number(condition.value)) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'touchingObjectInForever': {
            // control_forever の SUBSTACK をたどり指定オブジェクトへの touching if を確認
                const foreverBlocks = blockList.filter(b => b.opcode === 'control_forever');
                return foreverBlocks.some(foreverBlock => {
                    if (!foreverBlock.inputs || !foreverBlock.inputs.SUBSTACK) return false;
                    let currentId = foreverBlock.inputs.SUBSTACK.block;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === 'control_if' &&
                        currentBlock.inputs && currentBlock.inputs.CONDITION) {
                            const condBlock = blocks[currentBlock.inputs.CONDITION.block];
                            if (condBlock && condBlock.opcode === 'sensing_touchingobject' &&
                            getTouchingObjectName(condBlock) === condition.objectName) {
                                return true;
                            }
                        }
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'insideTouchingBowl': {
            // Bowl触れたなら の if の SUBSTACK をたどり childOpcode を探す
                const bowlIf = findTouchingIf('Bowl');
                if (!bowlIf || !bowlIf.inputs || !bowlIf.inputs.SUBSTACK) return false;
                let currentId = bowlIf.inputs.SUBSTACK.block;
                while (currentId) {
                    const currentBlock = blocks[currentId];
                    if (!currentBlock) break;
                    if (currentBlock.opcode === condition.childOpcode) {
                        if (!condition.field) return true;
                        // field が指定されている場合は入力ブロック経由で数値比較
                        const input = currentBlock.inputs && currentBlock.inputs[condition.field];
                        if (input) {
                            const valueBlockId = input.block || input.shadow;
                            if (valueBlockId) {
                                const valueBlock = blocks[valueBlockId];
                                if (valueBlock && valueBlock.fields) {
                                    const fieldValues = Object.values(valueBlock.fields);
                                    if (fieldValues.length > 0 &&
                                    Number(fieldValues[0].value) === Number(condition.fieldValue)) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    currentId = currentBlock.next;
                }
                return false;
            }

            case 'randomInXInsideTouchingBowl': {
            // Bowl if 内の motion_gotoxy の X に operator_random（from/to）が入り Y 値が一致するか
                const bowlIf = findTouchingIf('Bowl');
                if (!bowlIf || !bowlIf.inputs || !bowlIf.inputs.SUBSTACK) return false;

                const getInputNum = (parentBlock, inputName) => {
                    if (!parentBlock.inputs) return null;
                    const input = parentBlock.inputs[inputName];
                    if (!input) return null;
                    const valueBlockId = input.block || input.shadow;
                    if (!valueBlockId) return null;
                    const valueBlock = blocks[valueBlockId];
                    if (!valueBlock || !valueBlock.fields) return null;
                    const fieldValues = Object.values(valueBlock.fields);
                    return fieldValues.length > 0 ? Number(fieldValues[0].value) : null;
                };

                let currentId = bowlIf.inputs.SUBSTACK.block;
                while (currentId) {
                    const currentBlock = blocks[currentId];
                    if (!currentBlock) break;
                    if (currentBlock.opcode === 'motion_gotoxy' && currentBlock.inputs) {
                        const xBlockId = currentBlock.inputs.X && currentBlock.inputs.X.block;
                        if (xBlockId) {
                            const xBlock = blocks[xBlockId];
                            if (xBlock && xBlock.opcode === 'operator_random') {
                                if (getInputNum(xBlock, 'FROM') === Number(condition.from) &&
                                getInputNum(xBlock, 'TO') === Number(condition.to) &&
                                getInputNum(currentBlock, 'Y') === Number(condition.y)) {
                                    return true;
                                }
                            }
                        }
                    }
                    currentId = currentBlock.next;
                }
                return false;
            }

            case 'blockInsideIf': {
            // CONDITION に ifOpcode を持つ control_if を探す
                const ifBlocks = blockList.filter(b => b.opcode === 'control_if');
                return ifBlocks.some(ifBlock => {
                    if (!ifBlock.inputs || !ifBlock.inputs.CONDITION) return false;
                    const conditionBlockId = ifBlock.inputs.CONDITION.block;
                    if (!conditionBlockId) return false;
                    const conditionBlock = blocks[conditionBlockId];
                    if (!conditionBlock || conditionBlock.opcode !== condition.ifOpcode) return false;

                    // SUBSTACK から next をたどって childOpcode を探す
                    if (!ifBlock.inputs.SUBSTACK) return false;
                    let currentId = ifBlock.inputs.SUBSTACK.block;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;
                        if (currentBlock.opcode === condition.childOpcode) {
                        // field/fieldValue が指定されている場合はフィールド値も確認
                            if (condition.field) {
                                const fieldObj = currentBlock.fields && currentBlock.fields[condition.field];
                                if (fieldObj && fieldObj.value === condition.fieldValue) return true;
                            } else {
                                return true;
                            }
                        }
                        currentId = currentBlock.next;
                    }
                    return false;
                });
            }

            case 'scoreResetAtStart': {
            // event_whenflagclicked の next チェーンをたどり data_setvariableto があるか確認
                const flagBlock = blockList.find(b => b.opcode === 'event_whenflagclicked');
                if (!flagBlock) return false;
                let currentId = flagBlock.next;
                while (currentId) {
                    const currentBlock = blocks[currentId];
                    if (!currentBlock) break;
                    if (currentBlock.opcode === 'data_setvariableto') return true;
                    currentId = currentBlock.next;
                }
                return false;
            }

            case 'scoreIncrementInsideBowlIf': {
            // Bowl触れたなら の if 内に data_changevariableby があるか確認
                const bowlIf = findTouchingIf('Bowl');
                if (!bowlIf || !bowlIf.inputs || !bowlIf.inputs.SUBSTACK) return false;
                let currentId = bowlIf.inputs.SUBSTACK.block;
                while (currentId) {
                    const currentBlock = blocks[currentId];
                    if (!currentBlock) break;
                    if (currentBlock.opcode === 'data_changevariableby') return true;
                    currentId = currentBlock.next;
                }
                return false;
            }

            default:
                return false;
            }
        })();
        // eslint-disable-next-line no-console
        console.log(`[checkConditions] ${condition.type}`, condition, '->', __r);
        return __r;
    });
};

export default checkConditions;
