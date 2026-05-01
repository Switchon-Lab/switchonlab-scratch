const fs = require('fs');
const path = require('path');

const copyDir = (src, dest) => {
    if (!fs.existsSync(src)) {
        console.warn(`スキップ: ${src} が見つかりません`);
        return;
    }
    fs.mkdirSync(dest, {recursive: true});
    for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

const contentRoot = path.resolve(__dirname, '../../switchonlab-content');

copyDir(path.join(contentRoot, 'navigator/asuka'), 'public/navigator');
copyDir(path.join(contentRoot, 'scenarios/flappy-hippo'), 'src/assets/scenarios');
copyDir(path.join(contentRoot, 'projects/flappy-hippo'), 'public/projects');
copyDir(path.join(contentRoot, 'hints/flappy-hippo'), 'public/hints');

console.log('コンテンツのコピーが完了しました。');
