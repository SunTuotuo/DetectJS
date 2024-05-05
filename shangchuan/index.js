const fs = require('fs');
const path = require('path');
const gsh = require("./get_script_htmlparser2");
const gil = require("./golbal_identifies_logs");
const fc = require('./find_conflicts');

function detectHtml(sourceFile) {
    let sourcePath = path.dirname(sourceFile);
    const folderName = path.basename(sourceFile).split('.')[0];

    // 使用 fs.readdirSync 读取目录内容（同步版本）
    try {
        const files = fs.readdirSync(sourcePath);
        // 检查目录中是否存在指定文件夹
        if (!files.includes(folderName)) {
            fs.mkdirSync(`${sourcePath}/${folderName}`, { recursive: true });
            fs.mkdirSync(`${sourcePath}/${folderName}/script`, { recursive: true });
            gsh.get_script_htmlparser(sourceFile, folderName, 1);
        }else{
            //gil.getLogs(`${sourcePath}/${folderName}/script`);
            fc.find_conflicts(`${sourcePath}/${folderName}/identifies_logs.txt`, `${sourcePath}/${folderName}/conflict.txt`);
        }
    } catch (err) {
        console.error(`出现错误: ${err.message}`);
    }

}

module.exports = {
    detectHtml,
};